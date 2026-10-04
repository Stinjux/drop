import type { MetadataRoute } from "next";
import { product } from "@/config/product";
import { env } from "@/server/env";

export default function robots(): MetadataRoute.Robots {
  if (!product.confirmed) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/fr/checkout", "/en/checkout"] },
    sitemap: `${env.siteUrl()}/sitemap.xml`,
  };
}
