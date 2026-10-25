"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { inputClass, labelClass, secondaryButton } from "@/components/ui/styles";
import { YEARS, describeFitment, type Fitment, type Make, type Model } from "@/lib/vehicles";
import { useT } from "@/components/lang-provider";

export const MAX_FITMENTS = 20;

type Props = {
  makes: Make[];
  models: Model[];
  fitments: Fitment[];
  onChange: (fitments: Fitment[]) => void;
  universal: boolean;
  onUniversalChange: (universal: boolean) => void;
};

const empty = { make: "", model: "", from: "", to: "" };

export function FitmentPicker({ makes, models, fitments, onChange, universal, onUniversalChange }: Props) {
  const { t } = useT();
  const [draft, setDraft] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const makeModels = models.filter((m) => String(m.make_id) === draft.make);

  function add() {
    if (!draft.make) return setError(t("Veldu tegund."));
    const from = draft.from ? Number(draft.from) : null;
    const to = draft.to ? Number(draft.to) : null;
    if (from && to && from > to) return setError(t("Árgerð frá má ekki vera hærri en árgerð til."));

    const fitment: Fitment = {
      make_id: Number(draft.make),
      model_id: draft.model ? Number(draft.model) : null,
      year_from: from,
      year_to: to,
    };
    const duplicate = fitments.some(
      (f) =>
        f.make_id === fitment.make_id &&
        f.model_id === fitment.model_id &&
        f.year_from === fitment.year_from &&
        f.year_to === fitment.year_to,
    );
    if (!duplicate) onChange([...fitments, fitment]);
    // Tegund helst valin svo auðvelt sé að bæta við fleiri gerðum sömu tegundar
    setDraft({ ...empty, make: draft.make });
    setError(null);
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 rounded-xl bg-surface p-4">
        <input
          type="checkbox"
          checked={universal}
          onChange={(e) => onUniversalChange(e.target.checked)}
          className="mt-0.5 size-5 accent-orange-600"
        />
        <span>
          <span className="block font-medium">{t("Passar í alla bíla")}</span>
          <span className="text-sm text-stone-500">{t("T.d. aukahlutir, verkfæri eða alhliða dekk")}</span>
        </span>
      </label>

      {!universal && (
        <>
          {fitments.length > 0 && (
            <ul className="space-y-2">
              {fitments.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-orange-50 px-4 py-3">
                  <span className="text-sm font-medium">{describeFitment(f, makes, models, t)}</span>
                  <button
                    type="button"
                    onClick={() => onChange(fitments.filter((_, j) => j !== i))}
                    aria-label={t("Fjarlægja")}
                    className="text-stone-500"
                  >
                    <X size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {fitments.length < MAX_FITMENTS && (
            <fieldset className="space-y-3 rounded-xl bg-surface p-4">
              <legend className="sr-only">{t("Bæta við bíl")}</legend>
              <label className="block">
                <span className={labelClass}>{t("Tegund")}</span>
                <select
                  value={draft.make}
                  onChange={(e) => setDraft({ ...empty, make: e.target.value })}
                  className={inputClass}
                >
                  <option value="">{t("Veldu tegund…")}</option>
                  {makes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelClass}>{t("Gerð")}</span>
                <select
                  value={draft.model}
                  onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  disabled={!draft.make}
                  className={inputClass}
                >
                  <option value="">{t("Allar gerðir")}</option>
                  {makeModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelClass}>{t("Árgerð frá")}</span>
                  <select
                    value={draft.from}
                    onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                    disabled={!draft.make}
                    className={inputClass}
                  >
                    <option value="">–</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>{t("Árgerð til")}</span>
                  <select
                    value={draft.to}
                    onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                    disabled={!draft.make}
                    className={inputClass}
                  >
                    <option value="">–</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <button type="button" onClick={add} className={secondaryButton}>
                <Plus size={18} className="-mt-0.5 mr-1 inline" />{" "}{t("Bæta við bíl")}
              </button>
            </fieldset>
          )}
        </>
      )}
    </div>
  );
}
