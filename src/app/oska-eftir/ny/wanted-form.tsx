"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputClass, labelClass, primaryButton } from "@/components/ui/styles";
import { KINDS, REGIONS, formatNumber, type Kind, type Region } from "@/lib/i18n";
import type { MyCar } from "@/lib/search";
import { createClient } from "@/lib/supabase/client";
import { YEARS, type Category, type Make, type Model } from "@/lib/vehicles";
import { useT } from "@/components/lang-provider";

type Props = {
  userId: string;
  makes: Make[];
  models: Model[];
  categories: Category[];
  initial: {
    query: string;
    kind: Kind | null;
    category: number | null;
    car: MyCar | null;
    maxPrice: number | null;
    region: Region | null;
  };
};

export function WantedForm({ userId, makes, models, categories, initial }: Props) {
  const { t, lang } = useT();
  const router = useRouter();
  const [query, setQuery] = useState(initial.query);
  const [kind, setKind] = useState<Kind | null>(initial.kind);
  const [category, setCategory] = useState(initial.category ? String(initial.category) : "");
  const [car, setCar] = useState({
    make: initial.car ? String(initial.car.make) : "",
    model: initial.car?.model ? String(initial.car.model) : "",
    year: initial.car?.year ? String(initial.car.year) : "",
  });
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice != null ? String(initial.maxPrice) : "");
  const [region, setRegion] = useState<Region | "">(initial.region ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parents = categories.filter((c) => c.parent_id === null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() && !category && !car.make) {
      return setError(t("Skrifaðu hvað þig vantar, eða veldu flokk eða bíl."));
    }
    setError(null);
    setSaving(true);
    const { error: err } = await createClient()
      .from("wanted_requests")
      .insert({
        user_id: userId,
        query: query.trim() || null,
        kind,
        category_id: kind && kind !== "part" ? null : category ? Number(category) : null,
        make_id: car.make ? Number(car.make) : null,
        model_id: car.model ? Number(car.model) : null,
        year: car.year ? Number(car.year) : null,
        max_price_isk: maxPrice ? Number(maxPrice) : null,
        region: region || null,
      });
    if (err) {
      setSaving(false);
      return setError(t("Ekki tókst að vista óskina. Reyndu aftur."));
    }
    router.push("/oska-eftir");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-md md:max-w-xl md:pt-10 space-y-5 px-4 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={() => router.back()} aria-label={t("Til baka")} className="-ml-2 px-2 text-2xl text-stone-600">
          <ChevronLeft size={26} />
        </button>
        <h1 className="text-xl font-bold">{t("Ný ósk")}</h1>
      </header>
      <p className="-mt-2 text-sm text-stone-600">
        {t("Þú færð tilkynningu í appinu um leið og auglýsing sem passar birtist.")}
      </p>

      <label className="block">
        <span className={labelClass}>{t("Hvað vantar þig?")}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 100))}
          placeholder={t("t.d. vinstra framljós, dráttarkrókur")}
          className={inputClass}
        />
      </label>

      <fieldset>
        <legend className={labelClass}>{t("Tegund")}</legend>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-stone-200 p-1">
          {([null, ...(Object.keys(KINDS) as Kind[])] as (Kind | null)[]).map((k) => (
            <button
              key={k ?? "allt"}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`rounded-lg py-2 text-sm font-medium ${kind === k ? "bg-surface shadow-sm" : "text-stone-600"}`}
            >
              {k ? t(KINDS[k]) : t("Allt")}
            </button>
          ))}
        </div>
      </fieldset>

      {(!kind || kind === "part") && (
        <label className="block">
          <span className={labelClass}>{t("Flokkur (valfrjálst)")}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            <option value="">{t("Allir flokkar")}</option>
            {parents.map((p) => (
              <optgroup key={p.id} label={t(p.name)}>
                <option value={p.id}>{t("Allt í")}{" "}{t(p.name).toLowerCase()}</option>
                {categories
                  .filter((c) => c.parent_id === p.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {t(c.name)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}

      <fieldset className="space-y-3 rounded-2xl bg-surface p-4">
        <legend className="sr-only">{t("Bíll")}</legend>
        <p className="font-medium">{t("Fyrir hvaða bíl?")}</p>
        <label className="block">
          <span className={labelClass}>{t("Tegund")}</span>
          <select
            value={car.make}
            onChange={(e) => setCar({ make: e.target.value, model: "", year: car.year })}
            className={inputClass}
          >
            <option value="">{t("Hvaða bíl sem er")}</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>{t("Gerð")}</span>
            <select
              value={car.model}
              onChange={(e) => setCar({ ...car, model: e.target.value })}
              disabled={!car.make}
              className={inputClass}
            >
              <option value="">{t("Allar")}</option>
              {models
                .filter((m) => String(m.make_id) === car.make)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>{t("Árgerð")}</span>
            <select
              value={car.year}
              onChange={(e) => setCar({ ...car, year: e.target.value })}
              disabled={!car.make}
              className={inputClass}
            >
              <option value="">{t("Allar")}</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>{t("Hámarksverð")}</span>
          <div className="relative">
            <input
              value={maxPrice ? formatNumber(Number(maxPrice), lang) : ""}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, "").slice(0, 9))}
              inputMode="numeric"
              placeholder={t("Ekkert")}
              className={`${inputClass} pr-10`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">{t("kr.")}</span>
          </div>
        </label>
        <label className="block">
          <span className={labelClass}>{t("Landshluti")}</span>
          <select value={region} onChange={(e) => setRegion(e.target.value as Region | "")} className={inputClass}>
            <option value="">{t("Allt landið")}</option>
            {Object.entries(REGIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={saving} className={primaryButton}>
        {saving ? t("Vista…") : t("Vista ósk")}
      </button>
    </form>
  );
}
