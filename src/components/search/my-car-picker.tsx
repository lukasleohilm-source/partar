"use client";

import { Check, CarFront, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

// „Mínir bílar“: listi yfir bíla notandans í þessum vafra (virki bíllinn er í vafraköku)
const GARAGE_KEY = "partar_bilar";
const sameCar = (a: MyCar, b: MyCar) => a.make === b.make && a.model === b.model && a.year === b.year;

function readGarage(): MyCar[] {
  try {
    const v = JSON.parse(localStorage.getItem(GARAGE_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => Number.isInteger(x?.make)).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function writeGarage(cars: MyCar[]) {
  try {
    localStorage.setItem(GARAGE_KEY, JSON.stringify(cars.slice(0, 6)));
  } catch {
    // Geymsla ekki tiltæk (t.d. huliðsgluggi); listinn gleymist bara
  }
}

export function MyCarPicker({ makes, models, car, active, toggleHref }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [garage, setGarage] = useState<MyCar[]>([]);

  useEffect(() => {
    if (!open) return;
    const cars = readGarage();
    // Virki bíllinn er alltaf í listanum
    if (car && !cars.some((x) => sameCar(x, car))) cars.unshift(car);
    setGarage(cars);
  }, [open, car]);
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
    const next = {
      make: Number(draft.make),
      model: draft.model ? Number(draft.model) : null,
      year: draft.year ? Number(draft.year) : null,
    };
    writeGarage([next, ...garage.filter((x) => !sameCar(x, next))]);
    apply(next);
  }

  function forget(target: MyCar) {
    const rest = garage.filter((x) => !sameCar(x, target));
    writeGarage(rest);
    setGarage(rest);
    if (car && sameCar(car, target)) apply(rest[0] ?? null);
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
              Vista og nota bíl
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
          {garage.length > 0 && (
            <section className="mb-2">
              <h3 className={labelClass}>Mínir bílar</h3>
              <ul className="space-y-1.5">
                {garage.map((g) => {
                  const isActive = car ? sameCar(car, g) : false;
                  return (
                    <li key={`${g.make}-${g.model}-${g.year}`} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => apply(g)}
                        className={`flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 ${isActive ? "bg-orange-50 ring-orange-300" : "bg-surface ring-black/5"}`}
                      >
                        <CarFront size={18} className="text-orange-600" />
                        <span className="flex-1 truncate font-medium">{carLabel(g, makes, models)}</span>
                        {isActive && <Check size={18} className="text-orange-600" />}
                      </button>
                      <button type="button" onClick={() => forget(g)} aria-label="Fjarlægja bíl" className="flex size-10 items-center justify-center rounded-xl text-stone-400 active:bg-stone-100">
                        <X size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <h3 className={`${labelClass} mt-4`}>Bæta við bíl</h3>
            </section>
          )}
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
          <p className="text-sm text-stone-500">Bílarnir eru vistaðir í þessum vafra. Leit eftir bílnúmeri kemur síðar.</p>
        </div>
      </BottomSheet>
    </>
  );
}
