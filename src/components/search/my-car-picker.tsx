"use client";

import { CarFront, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { inputClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { serializeMyCar, type MyCar } from "@/lib/search";
import { YEARS, carLabel, type Make, type Model } from "@/lib/vehicles";

type Props = {
  makes: Make[];
  models: Model[];
  car: MyCar | null;
  /** Á leitarsíðu: hvort síað sé eftir bílnum núna */
  active?: boolean;
  /** Slóð til að sýna allt (bill=allir) eða aftur bara það sem passar */
  toggleHref?: string;
};

export function MyCarPicker({ makes, models, car, active, toggleHref }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    make: car ? String(car.make) : "",
    model: car?.model ? String(car.model) : "",
    year: car?.year ? String(car.year) : "",
  });

  function apply(next: MyCar | null) {
    document.cookie = serializeMyCar(next);
    setOpen(false);
    // Nýr bíll á að gilda strax, líka ef notandi hafði valið „Sýna allt“
    const url = new URL(window.location.href);
    url.searchParams.delete("bill");
    url.searchParams.delete("sida");
    router.replace(url.pathname + url.search);
    router.refresh();
  }

  function save() {
    if (!draft.make) return;
    apply({
      make: Number(draft.make),
      model: draft.model ? Number(draft.model) : null,
      year: draft.year ? Number(draft.year) : null,
    });
  }

  return (
    <>
      {car ? (
        <div
          className={`flex items-center gap-3 rounded-2xl p-3 shadow-sm ring-1 ${active ? "bg-orange-50 ring-orange-200" : "bg-surface ring-black/5"}`}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white" aria-hidden>
            <CarFront size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-stone-500">{active ? "Sýni bara það sem passar í" : "Minn bíll"}</p>
            <p className="truncate font-semibold">{carLabel(car, makes, models)}</p>
          </div>
          {toggleHref && (
            <a href={toggleHref} className="shrink-0 text-sm font-medium text-orange-700 underline-offset-2 active:underline">
              {active ? "Sýna allt" : "Bara það sem passar"}
            </a>
          )}
          <button type="button" onClick={() => setOpen(true)} className="shrink-0 text-sm font-medium text-stone-600">
            Breyta
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-orange-300 bg-surface/70 p-3 text-left active:bg-orange-50"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600" aria-hidden>
            <CarFront size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Veldu þinn bíl</span>
            <span className="text-sm text-stone-500">Sjáðu bara hluti sem passa</span>
          </span>
          <ChevronRight size={20} className="text-stone-400" aria-hidden />
        </button>
      )}

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Minn bíll"
        footer={
          <div className="space-y-2">
            <button type="button" onClick={save} disabled={!draft.make} className={primaryButton}>
              Vista bíl
            </button>
            {car && (
              <button type="button" onClick={() => apply(null)} className={secondaryButton}>
                Fjarlægja bíl
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className={labelClass}>Tegund</span>
            <select
              value={draft.make}
              onChange={(e) => setDraft({ make: e.target.value, model: "", year: draft.year })}
              className={inputClass}
            >
              <option value="">Veldu tegund…</option>
              {makes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Gerð</span>
            <select
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              disabled={!draft.make}
              className={inputClass}
            >
              <option value="">Allar gerðir</option>
              {models
                .filter((m) => String(m.make_id) === draft.make)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Árgerð</span>
            <select
              value={draft.year}
              onChange={(e) => setDraft({ ...draft, year: e.target.value })}
              className={inputClass}
            >
              <option value="">Allar árgerðir</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-stone-500">Bíllinn er vistaður í þessum vafra. Leit eftir bílnúmeri kemur síðar.</p>
        </div>
      </BottomSheet>
    </>
  );
}
