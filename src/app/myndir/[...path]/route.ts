// Myndir auglýsinga í gegnum skyndiminni Cloudflare. Supabase er aðeins spurt þegar myndin er ekki
// þegar í skyndiminni, svo umferðin þaðan (sem er takmörkuð) dugar margfalt lengur.
// Hver mynd fær einstaka slóð (ný mynd = nýtt nafn), svo það er óhætt að geyma hana lengi.

// notandi/auglýsing/mynd.ext — aðrar möppur (t.d. tmp) eru ekki afgreiddar hér
const SAFE_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[\w-]+\.(webp|jpe?g|png)$/i;

// Hámark 7 dagar í skyndiminni Cloudflare: mynd sem er eytt hverfur þaðan innan viku
const EDGE_TTL = 7 * 24 * 60 * 60;

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!SAFE_PATH.test(path)) return new Response("Ekki til", { status: 404 });

  const source = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
  const res = await fetch(source, { cf: { cacheEverything: true, cacheTtl: EDGE_TTL } } as RequestInit);
  if (!res.ok) return new Response("Ekki til", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/webp",
      "Cache-Control": `public, max-age=${EDGE_TTL}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
