import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";

const SITE = process.env.SITE_URL ?? "https://partar.lukels255.com";

// Vefkort fyrir Google: forsíða, leit, flokkar og allar virkar auglýsingar
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const [{ data: listings }, { data: categories }] = await Promise.all([
    supabase.from("listings").select("id, updated_at").eq("status", "active").order("sort_at", { ascending: false }).limit(5000),
    supabase.from("categories").select("id").is("parent_id", null),
  ]);

  return [
    { url: SITE, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE}/leit`, changeFrequency: "hourly", priority: 0.9 },
    ...(categories ?? []).map((c) => ({ url: `${SITE}/leit?flokkur=${c.id}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...(listings ?? []).map((l) => ({
      url: `${SITE}/auglysing/${l.id}`,
      lastModified: l.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    { url: `${SITE}/skilmalar`, priority: 0.2 },
    { url: `${SITE}/personuvernd`, priority: 0.2 },
    { url: `${SITE}/gagnaeyding`, priority: 0.1 },
  ];
}
