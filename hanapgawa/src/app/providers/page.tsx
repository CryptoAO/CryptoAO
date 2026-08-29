import ProvidersDirectory from "./directory";
import { initialProviders } from "@/lib/landing";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const initial = await initialProviders();
  return <ProvidersDirectory initial={initial} />;
}
