import { SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-24 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-stone-200 text-stone-500">
        <SearchX size={32} />
      </div>
      <h1 className="text-xl font-extrabold">Síðan fannst ekki</h1>
      <p className="mt-2 text-stone-600">Auglýsingin hefur kannski verið seld eða fjarlægð.</p>
      <div className="mt-6 flex gap-2">
        <Link href="/leit" className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white active:bg-orange-700">
          Leita
        </Link>
        <Link href="/" className="rounded-xl border border-stone-300 bg-surface px-5 py-3 font-medium">
          Forsíða
        </Link>
      </div>
    </div>
  );
}
