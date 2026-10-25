import Link from "next/link";

export function LegalLinks() {
  return (
    <nav aria-label="Skilmálar" className="mt-8 flex justify-center gap-4 text-xs text-stone-500">
      <Link href="/skilmalar" className="underline-offset-2 hover:underline">
        Skilmálar
      </Link>
      <Link href="/personuvernd" className="underline-offset-2 hover:underline">
        Persónuvernd
      </Link>
    </nav>
  );
}
