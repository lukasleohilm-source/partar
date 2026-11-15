"use client";

import { Check, ChevronRight, ChevronsUpDown, LocateFixed, Loader2, MapPin, Minus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/components/lang-provider";
import { REGIONS, type Region } from "@/lib/i18n";
import { PLACE_TREE, POSTAL, nearestPostal, normalizePlaces, postalMunicipality, postalRegion, regionCodes } from "@/lib/places";

// Staðsetningarval eins og á mbl fasteignum: landshluti → sveitarfélag → póstnúmer, með hökum.
// Gildi er listi af „táknum“: póstnúmer ('210') og/eða landshlutar ('sudurnes').

type Tr = (s: string, v?: Record<string, string | number>) => string;
type CheckState = boolean | "mixed";

// Leit án kommu og sérstafa: „gardab“ finnur Garðabæ
function fold(s: string): string {
  return s.toLowerCase().replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Stutt lýsing á vali: „Allt landið“, „Garðabær“, „210 Garðabær“, „Garðabær +2“ */
export function placesSummary(tokens: string[], t: Tr): string {
  if (!tokens.length) return t("Allt landið");
  const name = (tok: string) => (tok in REGIONS ? t(REGIONS[tok as Region]) : `${tok} ${POSTAL[tok]?.[0] ?? ""}`.trim());
  // Heilt sveitarfélag valið → nafn þess
  const muni = PLACE_TREE.flatMap((r) => r.towns).find(
    (m) => m.codes.length > 1 && m.codes.length === tokens.length && m.codes.every((c) => tokens.includes(c)),
  );
  if (muni) return muni.name;
  return tokens.length === 1 ? name(tokens[0]) : `${name(tokens[0])} +${tokens.length - 1}`;
}

/** Hakbox: hakað, ekki hakað eða hálfhakað (hluti valinn) */
function Box({ state }: { state: CheckState }) {
  const on = state !== false;
  return (
    <span
      aria-hidden
      className={`grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors ${
        on ? "border-orange-600 bg-orange-600 text-white" : "border-stone-400 bg-surface"
      }`}
    >
      {state === true && <Check size={13} strokeWidth={3.2} />}
      {state === "mixed" && <Minus size={13} strokeWidth={3.2} />}
    </span>
  );
}

type TreeProps = {
  /** "multi": haka í marga staði (leit). "single": einn staður (þegar auglýsing er sett inn) */
  mode: "multi" | "single";
  value: string[];
  onChange: (tokens: string[]) => void;
  /** Ef gefið: „Nálægt mér“-takki sem skilar næsta póstnúmeri */
  onNearMe?: (postal: string) => void;
  autoFocus?: boolean;
};

export function LocationTree({ mode, value, onChange, onNearMe, autoFocus = false }: TreeProps) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [openRegions, setOpenRegions] = useState<Set<Region>>(
    () => new Set(value.length ? value.map((v) => (v in REGIONS ? (v as Region) : postalRegion(v))) : ["hofudborgarsvaedid"]),
  );
  const [openMunis, setOpenMunis] = useState<Set<string>>(
    () => new Set(value.filter((v) => POSTAL[v]).map((v) => postalMunicipality(v))),
  );
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regionsSel = new Set(value.filter((v) => v in REGIONS) as Region[]);
  const codesSel = new Set(value.filter((v) => POSTAL[v]));
  const isOn = (code: string) => codesSel.has(code) || regionsSel.has(postalRegion(code));
  const stateOf = (codes: string[]): CheckState => {
    const n = codes.filter(isOn).length;
    return n === 0 ? false : n === codes.length ? true : "mixed";
  };

  // Hakað/afhakað í marga staði; útkoman er alltaf stöðluð (heill landshluti → landshlutatákn)
  function toggleMulti(codes: string[], region: Region, wholeRegion: boolean) {
    const nextCodes = new Set(codesSel);
    const nextRegions = new Set(regionsSel);
    const turnOn = stateOf(codes) !== true;
    // Landshluti valinn í heild sem tákn: brjóta hann upp í póstnúmer áður en hluti er tekinn af
    if (nextRegions.has(region)) {
      nextRegions.delete(region);
      regionCodes(region).forEach((c) => nextCodes.add(c));
    }
    if (turnOn) {
      if (wholeRegion) nextRegions.add(region);
      codes.forEach((c) => nextCodes.add(c));
    } else {
      codes.forEach((c) => nextCodes.delete(c));
    }
    onChange(normalizePlaces(nextCodes, nextRegions));
  }

  function select(tokens: string[], state: CheckState) {
    if (mode === "single") onChange(state === true ? [] : tokens);
  }

  function nearMe() {
    if (!navigator.geolocation) return setError(t("Tækið styður ekki staðsetningu."));
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const postal = nearestPostal(pos.coords.latitude, pos.coords.longitude);
        if (onNearMe) onNearMe(postal);
        else onChange([postal]);
      },
      () => {
        setLocating(false);
        setError(t("Ekki fékkst leyfi til að sjá staðsetningu."));
      },
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  const q = fold(query.trim());
  const tree = useMemo(() => {
    if (!q) return PLACE_TREE;
    return PLACE_TREE.map(({ region, towns }) => ({
      region,
      towns: fold(t(REGIONS[region])).includes(q)
        ? towns
        : towns.filter((m) => fold(m.name).includes(q) || m.codes.some((c) => c.startsWith(q) || fold(POSTAL[c][0]).includes(q))),
    })).filter((r) => r.towns.length > 0);
  }, [q, t]);

  const toggleSet = <T,>(set: Set<T>, key: T) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  const rowBase = "flex min-h-11 items-center gap-1 rounded-lg pr-2 transition-colors hover:bg-surface-2";
  const chevron = (open: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
      className="grid size-9 shrink-0 place-items-center rounded-full text-stone-500 hover:text-stone-900"
    >
      <ChevronRight size={18} className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={nearMe}
            disabled={locating}
            className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-sm font-medium text-stone-900 hover:bg-surface-2"
          >
            {locating ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />} {t("Nálægt mér")}
          </button>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-surface-2 hover:text-stone-900"
            >
              <X size={14} /> {mode === "multi" ? t("Hreinsa val") : t("Hreinsa")}
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5" role="tree" aria-label={t("Staðsetning")} aria-multiselectable={mode === "multi"}>
        {tree.length === 0 && <p className="p-4 text-center text-sm text-stone-500">{t("Engin staðsetning fannst.")}</p>}
        {tree.map(({ region, towns }) => {
          const open = Boolean(q) || openRegions.has(region);
          const codes = regionCodes(region);
          const rState: CheckState = regionsSel.has(region) ? true : stateOf(codes);
          const rLabel = t(REGIONS[region]);
          return (
            <div key={region} role="treeitem" aria-expanded={open} aria-selected={rState === true}>
              <div className={rowBase}>
                {chevron(open, open ? t("Loka {svaedi}", { svaedi: rLabel }) : t("Opna {svaedi}", { svaedi: rLabel }), () =>
                  setOpenRegions(toggleSet(openRegions, region)),
                )}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={rState}
                  onClick={() => (mode === "multi" ? toggleMulti(codes, region, true) : select([region], value.length === 1 && value[0] === region))}
                  className="flex flex-1 items-center gap-3 py-2 text-left font-semibold text-stone-900"
                >
                  <Box state={mode === "single" ? (value.length === 1 && value[0] === region ? true : rState === false ? false : "mixed") : rState} />
                  {rLabel}
                </button>
              </div>

              {open && (
                <div role="group">
                  {towns.map((m) => {
                    const many = m.codes.length > 1;
                    const mOpen = openMunis.has(m.name) || (Boolean(q) && many && !fold(m.name).includes(q));
                    const mState = stateOf(m.codes);
                    const singleMuni = mode === "single" && value.length === 1 && value[0] === m.codes[0] && !many;
                    return (
                      <div key={m.name} role="treeitem" aria-expanded={many ? mOpen : undefined} aria-selected={mState === true}>
                        <div className={`${rowBase} pl-6`}>
                          {many ? (
                            chevron(mOpen, t("Póstnúmer í {baer}", { baer: m.name }), () => setOpenMunis(toggleSet(openMunis, m.name)))
                          ) : (
                            <span className="size-9 shrink-0" />
                          )}
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={mode === "single" && many ? (mState === false ? false : "mixed") : mState}
                            onClick={() => {
                              if (mode === "multi") return toggleMulti(m.codes, region, false);
                              // Einn staður: sveitarfélag með fleiri póstnúmerum opnast svo seljandinn velji rétta númerið
                              if (many) return setOpenMunis(toggleSet(openMunis, m.name));
                              select([m.codes[0]], singleMuni);
                            }}
                            className="flex flex-1 items-center gap-3 py-2 text-left text-stone-800"
                          >
                            <Box state={mode === "single" && many ? (mState === false ? false : "mixed") : mState} />
                            <span className="flex-1">{m.name}</span>
                            {!many && <span className="text-sm tabular-nums text-stone-400">{m.codes[0]}</span>}
                          </button>
                        </div>

                        {many &&
                          mOpen &&
                          m.codes
                            .filter((c) => !q || fold(m.name).includes(q) || c.startsWith(q) || fold(POSTAL[c][0]).includes(q) || fold(t(REGIONS[region])).includes(q))
                            .map((code) => {
                              const cState: CheckState = isOn(code);
                              return (
                                <div key={code} role="treeitem" aria-selected={cState} className={`${rowBase} pl-[84px]`}>
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={cState}
                                    onClick={() =>
                                      mode === "multi" ? toggleMulti([code], region, false) : select([code], value.length === 1 && value[0] === code)
                                    }
                                    className="flex flex-1 items-center gap-3 py-2 text-left text-sm text-stone-700"
                                  >
                                    <Box state={cState} />
                                    <span>
                                      <span className="tabular-nums">{code}</span> – {POSTAL[code][0]}
                                    </span>
                                  </button>
                                </div>
                              );
                            })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Valin staðsetning auglýsingar: landshluti og (valfrjálst) póstnúmer */
export type Place = { region: Region; postal: string | null } | null;

/** Einn staður (söluform): hnappur sem opnar tréð undir sér, eins og „Staðsetning“ á mbl */
export function PlacePicker({ value, onChange, placeholder }: { value: Place; onChange: (place: Place) => void; placeholder?: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const tokens = value ? [value.postal ?? value.region] : [];
  const label = value
    ? value.postal && POSTAL[value.postal]
      ? `${POSTAL[value.postal][0]} · ${value.postal}`
      : t(REGIONS[value.region])
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="tree"
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-xl border bg-surface px-4 py-3 text-left text-base transition-colors ${
          open ? "border-orange-500 ring-2 ring-orange-500/20" : "border-stone-300 hover:border-line-strong"
        }`}
      >
        <MapPin size={18} className="shrink-0 text-stone-500" />
        <span className={`flex-1 truncate ${label ? "text-stone-900" : "text-stone-500"}`}>{label ?? placeholder ?? t("Veldu staðsetningu")}</span>
        <ChevronsUpDown size={17} className="shrink-0 text-stone-400" />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 flex max-h-[min(480px,65vh)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          <LocationTree
            mode="single"
            value={tokens}
            autoFocus
            onChange={(next) => {
              const tok = next[0];
              if (!tok) onChange(null);
              else if (tok in REGIONS) onChange({ region: tok as Region, postal: null });
              else onChange({ region: postalRegion(tok), postal: tok });
              if (tok) setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
