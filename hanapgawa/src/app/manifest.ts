import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. The audience is mostly budget Android on
// mobile data, so "Add to Home screen" matters more than a native app: it
// costs the user nothing to install and opens full-screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HanapGawa — May kailangan? May kaya!",
    short_name: "HanapGawa",
    description:
      "Marketplace ng serbisyo: labada, linis-bahay, hatid-sundo, padala, personal trainer at iba pa. Ligtas, may escrow, bayad sa app.",
    lang: "fil",
    dir: "ltr",
    start_url: "/jobs",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf9",
    theme_color: "#0f766e",
    categories: ["business", "productivity", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mag-post ng trabaho", short_name: "Mag-post", url: "/jobs/new" },
      { name: "Mga trabaho ko", short_name: "Trabaho ko", url: "/me" },
      { name: "Hanap provider", short_name: "Providers", url: "/providers" },
    ],
  };
}
