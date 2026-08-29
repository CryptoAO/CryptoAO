import JobsFeedShell from "./feed";
import { initialJobs } from "@/lib/landing";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const initial = await initialJobs();
  return <JobsFeedShell initial={initial} />;
}
