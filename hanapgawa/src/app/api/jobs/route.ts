import { NextRequest } from "next/server";
import { api, ok, ApiError, parseBody, clientIp, requireVerifiedUser, audit } from "@/lib/api";
import { db } from "@/lib/db";
import { jobCreateSchema } from "@/lib/validation";
import { rateLimit, LIMITS } from "@/lib/ratelimit";
import { formatPhp, parsePhpToCents } from "@/lib/money";
import { jobView } from "@/lib/serialize";
import { getSessionUser } from "@/lib/session";
import { distanceKm, getCity, isValidCityInRegion } from "@/lib/psgc";
import { broadcastNewJob, inviteProvider } from "@/lib/matching";
import { notify } from "@/lib/notify";

const PAGE_SIZE = 20;

/** Public job feed, filterable by region/city/category/search, geo-sortable. */
export const GET = api(async (req: NextRequest) => {
  const p = req.nextUrl.searchParams;
  const regionCode = p.get("region") ?? undefined;
  const cityCode = p.get("city") ?? undefined;
  const categoryId = p.get("category") ?? undefined;
  const q = (p.get("q") ?? "").trim().slice(0, 100);
  const sort = p.get("sort") === "near" ? "near" : "recent";
  const page = Math.max(1, Math.min(100, Number(p.get("page") ?? 1) || 1));

  const where = {
    status: "OPEN",
    visibility: "PUBLIC",
    ...(regionCode ? { regionCode } : {}),
    ...(cityCode ? { cityCode } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {}),
  };

  const [total, jobs] = await Promise.all([
    db.job.count({ where }),
    db.job.findMany({
      where,
      include: { client: true, category: true },
      orderBy: { createdAt: "desc" },
      // For "near" sort we fetch a wider window then sort by distance.
      take: sort === "near" ? 200 : PAGE_SIZE,
      skip: sort === "near" ? 0 : (page - 1) * PAGE_SIZE,
    }),
  ]);

  const viewer = await getSessionUser();
  let list = jobs;

  if (sort === "near") {
    const lat = Number(p.get("lat"));
    const lng = Number(p.get("lng"));
    const originCity = viewer ? getCity(viewer.cityCode) : null;
    const oLat = Number.isFinite(lat) ? lat : originCity?.lat;
    const oLng = Number.isFinite(lng) ? lng : originCity?.lng;
    if (oLat != null && oLng != null) {
      list = [...jobs].sort((a, b) => {
        const da = jobDistance(a, oLat, oLng);
        const dbb = jobDistance(b, oLat, oLng);
        return da - dbb;
      });
    }
    list = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }

  // An empty feed is a churn moment: a provider who opens the app to
  // "walang trabaho" and no next step does not open it again. Only when
  // there is nothing to show do we spend a query working out where the work
  // actually is, keeping the same category and search but dropping the
  // location the user picked.
  const alternatives = total === 0 ? await nearbyWithWork({ categoryId, q, regionCode }) : [];

  return ok({
    // "near" sorts within a window of the 200 newest matches — report the
    // window honestly instead of a total the pager can't actually reach.
    total: sort === "near" ? Math.min(total, 200) : total,
    alternatives,
    windowed: sort === "near" && total > 200 ? true : undefined,
    page,
    pageSize: PAGE_SIZE,
    jobs: list.map((j) => ({
      ...jobView(j, viewer?.id, viewer?.isAdmin),
      category: { id: j.category.id, slug: j.category.slug, name: j.category.name, nameTl: j.category.nameTl, icon: j.category.icon },
    })),
  });
});

interface Alternative {
  cityCode: string;
  regionCode: string;
  count: number;
}

/**
 * Cities that do have open work right now. Tries the user's own region
 * first — a job two towns over is worth a bus ride; one on another island
 * is not — and only widens nationally when the region is genuinely empty.
 */
async function nearbyWithWork(filters: {
  categoryId?: string;
  q: string;
  regionCode?: string;
}): Promise<Alternative[]> {
  const relaxed = {
    status: "OPEN",
    visibility: "PUBLIC",
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.q ? { OR: [{ title: { contains: filters.q } }, { description: { contains: filters.q } }] } : {}),
  };

  const group = async (where: object) =>
    db.job.groupBy({
      by: ["cityCode", "regionCode"],
      where: where as never,
      _count: { _all: true },
      orderBy: { _count: { cityCode: "desc" } },
      take: 5,
    });

  let rows = filters.regionCode ? await group({ ...relaxed, regionCode: filters.regionCode }) : [];
  if (rows.length === 0) rows = await group(relaxed);

  return rows.map((r) => ({ cityCode: r.cityCode, regionCode: r.regionCode, count: r._count._all }));
}

function jobDistance(job: { lat: number | null; lng: number | null; cityCode: string }, oLat: number, oLng: number) {
  if (job.lat != null && job.lng != null) return distanceKm(oLat, oLng, job.lat, job.lng);
  const c = getCity(job.cityCode);
  if (c?.lat != null && c?.lng != null) return distanceKm(oLat, oLng, c.lat, c.lng);
  return Number.POSITIVE_INFINITY;
}

/** Post a job. Requires verified phone (KYC L1). */
export const POST = api(async (req: NextRequest) => {
  const user = await requireVerifiedUser();
  if (!rateLimit(`jobpost:${user.id}`, LIMITS.jobPost.max, LIMITS.jobPost.windowMs)) {
    throw new ApiError(429, "You're posting too fast — try again in a bit");
  }
  const body = await parseBody(req, jobCreateSchema);
  if (!isValidCityInRegion(body.cityCode, body.regionCode)) {
    throw new ApiError(400, "Please pick a valid city and region");
  }

  const category = await db.category.findUnique({ where: { id: body.categoryId } });
  if (!category || !category.active) throw new ApiError(400, "Pick a valid category");

  const budgetCents = parsePhpToCents(body.budgetPhp);
  if (budgetCents < category.minPriceCents) {
    throw new ApiError(400, `Minimum budget for this category is ₱${category.minPriceCents / 100}`);
  }

  // A direct request needs a real target who can actually take the job.
  let directProvider = null;
  if (body.direct) {
    if (!body.inviteProviderId) throw new ApiError(400, "Direct booking needs a provider");
    directProvider = await db.user.findUnique({ where: { id: body.inviteProviderId } });
    if (!directProvider || !directProvider.isProvider || directProvider.status !== "ACTIVE") {
      throw new ApiError(400, "Hindi available ang provider na iyan");
    }
    if (directProvider.id === user.id) throw new ApiError(400, "Hindi mo pwedeng i-book ang sarili mo");
  }

  const job = await db.job.create({
    data: {
      clientId: user.id,
      categoryId: category.id,
      title: body.title,
      description: body.description,
      regionCode: body.regionCode,
      cityCode: body.cityCode,
      barangay: body.barangay,
      addressNote: body.addressNote,
      lat: body.lat,
      lng: body.lng,
      payType: body.payType,
      budgetCents,
      durationMin: body.durationMin,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      flexible: body.flexible,
      visibility: body.direct ? "DIRECT" : "PUBLIC",
      directProviderId: body.direct ? body.inviteProviderId : null,
    },
  });
  // Tell the people who can actually do this work that it exists. Failure
  // here must never lose the client's post, so it is deliberately outside
  // the create and swallowed.
  let notified = 0;
  try {
    if (body.direct && directProvider) {
      // Private request: exactly one person hears about it, and the copy
      // says what confirming will do — book the job and hold the money.
      await notify({
        userId: directProvider.id,
        type: "DIRECT_REQUEST",
        title: `Booking request: ${formatPhp(budgetCents)}`,
        body: `Gusto kang i-book ni ${user.firstName} para sa "${job.title}". Kapag kinumpirma mo, booked na ito agad.`,
        href: `/jobs/${job.id}`,
        jobId: job.id,
      });
      notified = 1;
    } else {
      if (body.inviteProviderId) {
        await inviteProvider(job.id, body.inviteProviderId, user.firstName);
      }
      const result = await broadcastNewJob(job.id);
      notified = result.notified;
    }
  } catch (e) {
    console.error("job broadcast failed", job.id, e);
  }

  await audit("job.create", {
    actorId: user.id,
    targetType: "Job",
    targetId: job.id,
    meta: { notified },
    ip: clientIp(req),
  });
  return ok({ job: jobView(job, user.id), providersNotified: notified }, 201);
});
