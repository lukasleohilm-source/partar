import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// Sameiginlegt útlit fyrir skilmála og persónuverndarstefnu
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-md px-4 pt-6 text-stone-800">
      <Link href="/" className="text-sm text-stone-500">
        <ChevronLeft size={16} className="-mt-0.5 inline" /> Forsíða
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{title}</h1>
      <p className="mb-4 text-sm text-stone-500">Síðast uppfært {updated}</p>
      <p className="mb-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        Drög. Þessi texti hefur ekki verið yfirfarinn af lögfræðingi og upplýsingar um rekstraraðila vantar.
      </p>
      <div className="space-y-4 leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </article>
  );
}
