import { NextRequest } from "next/server";
import { api, ok, ApiError, parseBody, clientIp, requireVerifiedUser, audit } from "@/lib/api";
import { db } from "@/lib/db";
import { jobCreateSchema } from "@/lib/validation";
import { rateLimit, LIMITS } from "@/lib/ratelimit";
import { parsePhpToCents } from "@/lib/money";
import { jobView } from "@/lib/serialize";
import { getSessionUser } from "@/lib/session";
import { distanceKm, getCity } from "@/lib/psgc";

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

  return ok({
    total,
    page,
    pageSize: PAGE_SIZE,
    jobs: list.map((j) => ({
      ...jobView(j, viewer?.id, viewer?.isAdmin),
      category: { id: j.category.id, slug: j.category.slug, name: j.category.name, nameTl: j.category.nameTl, icon: j.category.icon },
    })),
  });
});

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

  const category = await db.category.findUnique({ where: { id: body.categoryId } });
  if (!category || !category.active) throw new ApiError(400, "Pick a valid category");

  const budgetCents = parsePhpToCents(body.budgetPhp);
  if (budgetCents < category.minPriceCents) {
    throw new ApiError(400, `Minimum budget for this category is ₱${category.minPriceCents / 100}`);
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
    },
  });
  await audit("job.create", { actorId: user.id, targetType: "Job", targetId: job.id, ip: clientIp(req) });
  return ok({ job: jobView(job, user.id) }, 201);
});
