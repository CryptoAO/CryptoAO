import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCity } from "@/lib/psgc";

// Share preview for provider profiles: first name + last initial only, the
// same privacy projection the page itself uses.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const u = await db.user
    .findFirst({
      where: { id, isProvider: true, status: "ACTIVE" },
      select: {
        firstName: true,
        lastName: true,
        cityCode: true,
        providerCategories: { select: { category: { select: { nameTl: true } } }, take: 3 },
      },
    })
    .catch(() => null);
  if (!u) return { title: "Provider — HanapGawa" };
  const name = `${u.firstName} ${u.lastName.charAt(0).toUpperCase()}.`;
  const city = getCity(u.cityCode)?.name ?? u.cityCode;
  const services = u.providerCategories.map((pc) => pc.category.nameTl).join(", ");
  const title = `${name} — ${services || "Service Provider"} · ${city}`;
  const description = `Verified service provider sa ${city}. Bayad sa app, protektado ng escrow. HanapGawa.`;
  return { title, description, openGraph: { title, description }, twitter: { title, description } };
}

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
