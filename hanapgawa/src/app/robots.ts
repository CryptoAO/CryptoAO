import type { MetadataRoute } from "next";
import { DEMO_MODE } from "@/lib/demo";
import { baseUrl } from "@/lib/baseurl";

// The demo must never be indexed even if its auth wall were lifted; in
// production, private surfaces stay out of crawlers regardless.
export default function robots(): MetadataRoute.Robots {
  if (DEMO_MODE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/me", "/verify/"],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
