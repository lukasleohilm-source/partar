// Leyfir aðeins innri slóðir sem áframsendingu (kemur í veg fyrir open redirect).
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  try {
    const url = new URL(next, "http://x");
    if (next.startsWith("http") || next.startsWith("//")) {
      // Töfrahlekkur skilar fullri slóð; notum aðeins slóðina sjálfa
      return url.pathname + url.search;
    }
    return next.startsWith("/") ? url.pathname + url.search : fallback;
  } catch {
    return fallback;
  }
}
