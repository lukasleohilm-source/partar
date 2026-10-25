import { ChevronLeft, Languages } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/lang-server";

// Sameiginlegt útlit fyrir skilmála og persónuverndarstefnu.
// Lagatextinn sjálfur er aðeins á íslensku; á ensku er sagt frá því efst.
export async function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const { t, lang } = await getT();
  return (
    <article className="mx-auto max-w-md px-4 pt-6 text-stone-800 md:max-w-2xl md:pt-10">
      <Link href="/" className="text-sm text-stone-500">
        <ChevronLeft size={16} className="-mt-0.5 inline" /> {t("Forsíða")}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{t(title)}</h1>
      <p className="mb-4 text-sm text-stone-500">
        {t("Síðast uppfært")} {updated}
      </p>
      {lang === "en" && (
        <p lang="en" className="mb-4 flex gap-2 rounded-xl bg-sky-500/10 p-3 text-sm text-sky-900">
          <Languages size={18} className="mt-0.5 shrink-0" />
          This page is only available in Icelandic. The Icelandic text is the binding version.
        </p>
      )}
      <p className="mb-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        {t("Drög. Þessi texti hefur ekki verið yfirfarinn af lögfræðingi og upplýsingar um rekstraraðila vantar.")}
      </p>
      <div lang="is" className="space-y-4 leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </article>
  );
}
