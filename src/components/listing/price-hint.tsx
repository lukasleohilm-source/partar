"use client";

import { ExternalLink, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/components/lang-provider";
import { formatPrice, type Kind } from "@/lib/i18n";
import { REFERENCE_AS_OF, compareLinks, matchReference } from "@/lib/price-reference";
import { createClient } from "@/lib/supabase/client";

type PartarStats = { n: number; scope: "model" | "make" | "any"; low: number; median: number; high: number };

type Props = {
  kind: Kind;
  title: string;
  categoryId: number | null;
  makeId: number | null;
  modelId: number | null;
  /** Bíllinn í orðum, notaður í samanburðarleit (t.d. „Toyota Yaris“) */
  carLabel: string;
  excludeId?: string;
  onUse: (price: number) => void;
};

// Verðviðmið þegar hlutur er settur á sölu: fyrst sambærilegar auglýsingar á Partar,
// annars viðmiðunarverð úr íslenskum söluauglýsingum, og alltaf tenglar til að bera saman sjálf/ur.
export function PriceHint({ kind, title, categoryId, makeId, modelId, carLabel, excludeId, onUse }: Props) {
  const { t, lang } = useT();
  const match = useMemo(() => (kind === "part" ? matchReference(title) : null), [kind, title]);
  const [stats, setStats] = useState<PartarStats | null>(null);

  // Spyr gagnagrunninn þegar seljandinn hefur hætt að skrifa
  useEffect(() => {
    const text = title.trim();
    if (text.length < 3) return setStats(null);
    const timer = setTimeout(async () => {
      const { data } = await createClient().rpc("price_reference", {
        p_kind: kind,
        p_title: text,
        p_keyword: match?.keyword ?? null,
        p_category: kind === "part" ? categoryId : null,
        p_make: makeId,
        p_model: modelId,
        p_exclude: excludeId ?? null,
      });
      setStats((data as PartarStats | null) ?? null);
    }, 600);
    return () => clearTimeout(timer);
  }, [kind, title, match?.keyword, categoryId, makeId, modelId, excludeId]);

  if (title.trim().length < 3) return null;

  const ref = match?.ref;
  const query = [title.trim(), carLabel].filter(Boolean).join(" ");
  const scopeText = stats?.scope === "model" ? t("í sömu bílgerð") : stats?.scope === "make" ? t("af sömu tegund") : t("á Partar");

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface p-3.5 text-sm">
      <p className="flex items-center gap-2 font-medium text-stone-900">
        <TrendingUp size={16} strokeWidth={2} className="text-orange-700" aria-hidden /> {t("Verðviðmið")}
      </p>

      {stats ? (
        <div className="mt-2">
          <p className="text-stone-600">
            {t("{n} sambærilegar auglýsingar {svid}:", { n: stats.n, svid: scopeText })}{" "}
            <span className="font-semibold tabular-nums text-stone-900">
              {formatPrice(stats.low, lang)} – {formatPrice(stats.high, lang)}
            </span>
          </p>
          <UseButton price={stats.median} label={t("Miðgildi")} onUse={onUse} />
        </div>
      ) : ref ? (
        <div className="mt-2">
          <p className="text-stone-600">
            {t("Verðbil – {hlutur}:", { hlutur: t(ref.label) })}{" "}
            <span className="font-semibold tabular-nums text-stone-900">
              {formatPrice(ref.low, lang)} – {formatPrice(ref.high, lang)}
            </span>
          </p>
          {ref.note && <p className="mt-1 text-[13px] text-stone-500">{t(ref.note)}</p>}
          {ref.median != null && <UseButton price={ref.median} label={t("Algengt verð")} onUse={onUse} />}
          <p className="mt-2 text-xs text-stone-500">
            {t("Úrtak {n} auglýstra verða hjá íslenskum partasölum og sölusíðum, {dags}.", {
              n: ref.n,
              dags: REFERENCE_AS_OF === "2026-11" ? t("nóv. 2026") : REFERENCE_AS_OF,
            })}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-stone-600">{t("Engin sambærileg verð fundust enn. Berðu saman á öðrum sölusíðum:")}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1.5 border-t border-line pt-3">
        <span className="mr-1 text-[13px] text-stone-500">{t("Bera saman:")}</span>
        {compareLinks(query).map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-stone-700 transition-colors hover:bg-surface-2 hover:text-stone-900"
          >
            {l.label} <ExternalLink size={12} aria-hidden />
          </a>
        ))}
      </div>
    </div>
  );
}

function UseButton({ price, label, onUse }: { price: number; label: string; onUse: (price: number) => void }) {
  const { t, lang } = useT();
  return (
    <button
      type="button"
      onClick={() => onUse(price)}
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-stone-900 transition-colors hover:bg-surface-3 active:scale-[0.97]"
    >
      {label}: <span className="tabular-nums">{formatPrice(price, lang)}</span> · {t("Nota þetta verð")}
    </button>
  );
}
