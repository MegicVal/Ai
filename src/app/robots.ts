import type { MetadataRoute } from "next";

// Concept site: keep every crawler out.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
