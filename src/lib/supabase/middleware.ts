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

  // Innskráning er ekki komin í viðmótið: á síðum sem þurfa notanda fær vafrinn
  // nafnlausan notanda. Seinna má tengja netfang við hann (updateUser) svo gögnin haldast.
  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
