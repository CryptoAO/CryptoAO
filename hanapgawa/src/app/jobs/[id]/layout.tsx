import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCity } from "@/lib/psgc";
import { pesos } from "@/lib/format";

// The page itself is a client component (offers, chat, actions), but the
// share preview must not be. This layout gives every job link a real
// unfurl — title, price, city — using only fields that are public anyway.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await db.job
    .findFirst({
      where: { id, visibility: "PUBLIC" },
      select: { title: true, budgetCents: true, payType: true, cityCode: true, category: { select: { nameTl: true, icon: true } } },
    })
    .catch(() => null);
  if (!job) return { title: "Trabaho — HanapGawa" };
  const city = getCity(job.cityCode)?.name ?? job.cityCode;
  const price = `${pesos(job.budgetCents)}${job.payType === "HOURLY" ? "/hr" : ""}`;
  const title = `${job.title} — ${price} · ${city}`;
  const description = `${job.category.icon} ${job.category.nameTl} sa ${city}. Protektado ng escrow — bayad sa app, hindi sa labas. HanapGawa.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default function JobLayout({ children }: { children: React.ReactNode }) {
  return children;
}
