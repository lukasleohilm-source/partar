import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Síður sem krefjast innskráningar
const PROTECTED = ["/ny-auglysing", "/skilabod", "/oska-eftir", "/tilkynningar", "/minar-auglysingar", "/profill"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Síður sem þurfa notanda: gestir fara á /byrja (CAPTCHA + nafnlaus notandi)
  // og koma svo aftur. Netfang má tengja seinna án þess að gögn tapist.
  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/byrja";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}
