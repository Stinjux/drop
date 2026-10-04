import type { MetadataRoute } from "next";
import { product } from "@/config/product";
import { LOCALES } from "@/config/types";
import { INFO_PAGES } from "@/content";
import { env } from "@/server/env";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!product.confirmed) return [];
  const site = env.siteUrl();
  return [
    ...LOCALES.map((l) => ({ url: `${site}/${l}`, changeFrequency: "weekly" as const, priority: 1 })),
    ...LOCALES.flatMap((l) => Object.values(INFO_PAGES).map((s) => ({ url: `${site}/${l}/${s[l]}`, priority: 0.3 }))),
  ];
}
