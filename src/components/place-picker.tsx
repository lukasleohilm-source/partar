"use client";

import { Check, ChevronDown, ChevronsUpDown, Globe, LocateFixed, Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/components/lang-provider";
import { REGIONS, type Region } from "@/lib/i18n";
import { PLACE_TREE, POSTAL, nearestPostal, postalRegion } from "@/lib/places";

/** Valin staðsetning: landshluti og (valfrjálst) póstnúmer. null = Allt landið */
export type Place = { region: Region; postal: string | null } | null;

// Leit án kommu og sérstafa: „gardabaer“ finnur Garðabæ
function fold(s: string): string {
  return s.toLowerCase().replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function placeText(place: Place, t: (s: string) => string): string {
  if (!place) return t("Allt landið");
  if (place.postal && POSTAL[place.postal]) return `${POSTAL[place.postal][0]} · ${place.postal}`;
  return t(REGIONS[place.region]);
}

type ListProps = {
  value: Place;
  onSelect: (place: Place) => void;
  /** Sýna „Allt landið“ (í leit, ekki þegar auglýsing er sett inn) */
  allowAll?: boolean;
  /** Má velja heilan landshluta án bæjar */
  allowRegion?: boolean;
  autoFocus?: boolean;
};

/** Leit + „Nálægt mér“ + landshlutar → bæir → póstnúmer, eins og á Leiguport */
export function PlaceList({ value, onSelect, allowAll = false, allowRegion = true, autoFocus = false }: ListProps) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [openRegions, setOpenRegions] = useState<Set<Region>>(() => new Set(value ? [value.region] : ["hofudborgarsvaedid"]));
  const [openTowns, setOpenTowns] = useState<Set<string>>(new Set());
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(set: Set<T>, key: T) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  // Leit: bæir eða póstnúmer sem passa; landshlutar án niðurstöðu faldir
  const q = fold(query.trim());
  const tree = useMemo(() => {
    if (!q) return PLACE_TREE;
    return PLACE_TREE.map(({ region, towns }) => ({
      region,
      towns: fold(t(REGIONS[region])).includes(q)
        ? towns
        : towns.filter((town) => fold(town.name).includes(q) || town.codes.some((c) => c.startsWith(q))),
    })).filter((r) => r.towns.length > 0);
  }, [q, t]);

  function nearMe() {
    if (!navigator.geolocation) return setError(t("Tækið styður ekki staðsetningu."));
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const postal = nearestPostal(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        onSelect({ region: postalRegion(postal), postal });
      },
      () => {
        setLocating(false);
        setError(t("Ekki fékkst leyfi til að sjá staðsetningu."));
      },
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  const selectedPostal = value?.postal ?? null;
  const row = "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2";

  return (
    <div className="flex min-h-0 flex-col">
      <div className="space-y-2.5 border-b border-line p-3">
        <label className="relative block">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Leita að staðsetningu")}
            aria-label={t("Leita að staðsetningu")}
            autoFocus={autoFocus}
            className="w-full rounded-xl border border-line-strong bg-surface py-2.5 pl-10 pr-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={nearMe}
            disabled={locating}
            className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-sm font-medium text-stone-900 hover:bg-surface-2"
          >
            {locating ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />} {t("Nálægt mér")}
          </button>
          {allowAll && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-pressed={value === null}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ${
                value === null ? "bg-orange-600 text-white" : "text-stone-700 hover:bg-surface-2"
              }`}
            >
              <Globe size={15} /> {t("Allt landið")}
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5" role="listbox" aria-label={t("Staðsetning")}>
        {tree.length === 0 && <p className="p-4 text-center text-sm text-stone-500">{t("Engin staðsetning fannst.")}</p>}
        {tree.map(({ region, towns }) => {
          const open = Boolean(q) || openRegions.has(region);
          const regionSelected = value?.region === region && !value.postal;
          return (
            <div key={region}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => (allowRegion ? onSelect({ region, postal: null }) : setOpenRegions(toggle(openRegions, region)))}
                  role="option"
                  aria-selected={regionSelected}
                  className={`${row} flex-1 font-semibold text-stone-900`}
                >
                  {t(REGIONS[region])}
                  {regionSelected && <Check size={16} className="text-orange-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenRegions(toggle(openRegions, region))}
                  aria-expanded={open}
                  aria-label={open ? t("Loka {svaedi}", { svaedi: t(REGIONS[region]) }) : t("Opna {svaedi}", { svaedi: t(REGIONS[region]) })}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-surface-2 hover:text-stone-900"
                >
                  <ChevronDown size={17} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
              </div>

              {open &&
                towns.map((town) => {
                  const many = town.codes.length > 1;
                  const townOpen = openTowns.has(town.name) || (Boolean(q) && /^\d/.test(q) && many);
                  const townSelected = selectedPostal != null && town.codes.includes(selectedPostal);
                  return (
                    <div key={town.name}>
                      <div className="flex items-center pl-4">
                        <button
                          type="button"
                          onClick={() => onSelect({ region, postal: town.codes[0] })}
                          role="option"
                          aria-selected={townSelected}
                          className={`${row} flex-1 ${townSelected ? "bg-orange-600/10 font-medium text-stone-900" : "text-stone-800"}`}
                        >
                          {town.name}
                          {!many && <span className="text-sm tabular-nums text-stone-400">{town.codes[0]}</span>}
                          {townSelected && <Check size={16} className="ml-auto text-orange-600" />}
                        </button>
                        {many && (
                          <button
                            type="button"
                            onClick={() => setOpenTowns(toggle(openTowns, town.name))}
                            aria-expanded={townOpen}
                            aria-label={t("Póstnúmer í {baer}", { baer: town.name })}
                            className="grid size-9 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-surface-2 hover:text-stone-900"
                          >
                            <ChevronDown size={16} className={`transition-transform ${townOpen ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </div>
                      {many &&
                        townOpen &&
                        town.codes
                          .filter((c) => !/^\d/.test(q) || c.startsWith(q))
                          .map((code) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => onSelect({ region, postal: code })}
                              role="option"
                              aria-selected={selectedPostal === code}
                              className={`${row} pl-12 text-sm ${selectedPostal === code ? "bg-orange-600/10 font-medium text-stone-900" : "text-stone-600"}`}
                            >
                              <span className="tabular-nums">{code}</span> {town.name}
                              {selectedPostal === code && <Check size={15} className="ml-auto text-orange-600" />}
                            </button>
                          ))}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Hnappur sem opnar staðsetningarvalið undir sér (eins og „Hvar?“ á Leiguport) */
export function PlacePicker({
  value,
  onChange,
  allowAll = false,
  allowRegion = true,
  placeholder,
}: {
  value: Place;
  onChange: (place: Place) => void;
  allowAll?: boolean;
  allowRegion?: boolean;
  placeholder?: string;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Lokast þegar smellt er utan við eða ýtt á Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const empty = value === null && !allowAll;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-xl border bg-surface px-4 py-3 text-left text-base transition-colors ${
          open ? "border-orange-500 ring-2 ring-orange-500/20" : "border-stone-300 hover:border-line-strong"
        }`}
      >
        <MapPin size={18} className="shrink-0 text-stone-500" />
        <span className={`flex-1 truncate ${empty ? "text-stone-500" : "text-stone-900"}`}>
          {empty ? (placeholder ?? t("Veldu staðsetningu")) : placeText(value, t)}
        </span>
        <ChevronsUpDown size={17} className="shrink-0 text-stone-400" />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 flex max-h-[min(460px,65vh)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          <PlaceList
            value={value}
            allowAll={allowAll}
            allowRegion={allowRegion}
            autoFocus
            onSelect={(p) => {
              onChange(p);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
