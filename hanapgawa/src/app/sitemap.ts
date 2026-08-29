import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/baseurl";

// Public, stable pages only. Jobs and provider profiles are deliberately
// out: jobs are ephemeral, and indexing people's profiles is a privacy
// decision to make explicitly at launch, not a sitemap default.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority,
  });
  return [
    page("/", 1),
    page("/jobs", 0.9),
    page("/providers", 0.9),
    page("/safety", 0.7),
    page("/register", 0.6),
    page("/login", 0.3),
    page("/terms", 0.2),
    page("/privacy", 0.2),
  ];
}
