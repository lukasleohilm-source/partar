import type { MetadataRoute } from "next";

const SITE = process.env.SITE_URL ?? "https://partar.lukels255.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Persónulegar síður og innri leiðir eiga ekki heima í leitarvélum
      disallow: ["/stjorn", "/skilabod", "/profill", "/minar-auglysingar", "/uppahalds", "/oska-eftir", "/byrja", "/innskraning", "/api/", "/auth/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
