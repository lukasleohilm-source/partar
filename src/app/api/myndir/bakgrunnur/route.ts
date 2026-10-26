import { createClient } from "@/lib/supabase/server";

// Fjarlægir bakgrunn af vörumynd með Cloudflare Images (segment=foreground).
// Vafrinn hleður myndinni fyrst upp í eigin tímabundna möppu (<notandi>/tmp/…) og sendir slóðina hingað;
// hér er hún sótt í gegnum cf.image og skilað sem gegnsærri PNG. Aðeins eigin myndir eru leyfðar.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let path: string;
  try {
    ({ path } = await request.json());
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (typeof path !== "string" || !path.startsWith(`${user.id}/tmp/`) || path.includes("..")) {
    return new Response("Forbidden", { status: 403 });
  }

  const source = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
  const res = await fetch(source, {
    // cf.image virkar aðeins í Cloudflare Worker; í staðbundinni keyrslu kemur upprunalega myndin til baka
    cf: { image: { segment: "foreground", format: "png", fit: "scale-down", width: 1600, height: 1600 } },
  } as RequestInit);

  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("png")) {
    return Response.json({ error: "segment_failed", status: res.status, type }, { status: 502 });
  }
  return new Response(res.body, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}
