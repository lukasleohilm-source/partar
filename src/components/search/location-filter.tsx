"use client";

import { ChevronDown, LocateFixed, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/lang-provider";
import { LocationTree, placesSummary } from "@/components/place-picker";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { POSTAL } from "@/lib/places";
import { DISTANCES, serializeMyPlace } from "@/lib/search";

// Staðsetning í leit, eins og á mbl fasteignum: haka í landshluta, sveitarfélög og póstnúmer.
// „Nálægt mér“ geymir staðinn þinn (vafrakaka) og raðar eftir fjarlægð, með valfrjálsu hámarki í km.
export function LocationFilter({ places, myPlace, maxKm }: { places: string[]; myPlace: string | null; maxKm?: number }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(places);
  const [near, setNear] = useState<string | null>(myPlace);
  const [km, setKm] = useState<number | undefined>(maxKm);

  const nearName = near ? POSTAL[near]?.[0] : null;
  const label = places.length
    ? placesSummary(places, t)
    : myPlace
      ? `${t("Nálægt mér")} · ${POSTAL[myPlace]?.[0] ?? myPlace}${maxKm ? ` · ${maxKm} km` : ""}`
      : t("Staðsetning");

  function openSheet() {
    setDraft(places);
    setNear(myPlace);
    setKm(maxKm);
    setOpen(true);
  }

  function apply(nextPlaces: string[], nextNear: string | null, nextKm: number | undefined) {
    document.cookie = serializeMyPlace(nextNear);
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("sida");
    url.searchParams.delete("landshluti"); // gamla sían; staðir koma í staðinn
    if (nextPlaces.length) url.searchParams.set("stadir", nextPlaces.join(","));
    else url.searchParams.delete("stadir");
    if (nextNear && nextKm) url.searchParams.set("innan", String(nextKm));
    else url.searchParams.delete("innan");
    if (nextNear && !url.searchParams.get("rodun")) url.searchParams.set("rodun", "distance");
    if (!nextNear && url.searchParams.get("rodun") === "distance") url.searchParams.delete("rodun");
    router.replace(url.pathname + url.search);
    router.refresh();
  }

  const active = places.length > 0 || Boolean(myPlace);

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-haspopup="dialog"
        className={`flex max-w-full shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold shadow-sm ring-1 active:scale-95 ${
          active ? "bg-orange-600/15 text-orange-700 ring-orange-600/30" : "bg-surface text-stone-900 ring-black/5"
        }`}
      >
        <MapPin size={16} className="shrink-0 text-orange-600" />
        <span className="truncate">{label}</span>
        <ChevronDown size={15} className="shrink-0 opacity-60" />
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("Staðsetning")}
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={() => apply([], null, undefined)} className={`${secondaryButton} flex-1`}>
              {t("Allt landið")}
            </button>
            <button type="button" onClick={() => apply(draft, near, near ? km : undefined)} className={`${primaryButton} flex-[2]`}>
              {t("Sýna auglýsingar")}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {near && (
            <div className="rounded-2xl border border-orange-600/30 bg-orange-600/10 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                <LocateFixed size={16} className="text-orange-600" /> {t("Nálægt mér")}: {nearName}
                <button type="button" onClick={() => setNear(null)} className="ml-auto text-sm font-medium text-orange-700 hover:underline">
                  {t("Fjarlægja")}
                </button>
              </p>
              <p className="mt-1 text-xs text-stone-600">{t("Næstu auglýsingar birtast fyrst. Hámarksfjarlægð:")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[undefined, ...DISTANCES].map((d) => (
                  <button
                    key={d ?? "allt"}
                    type="button"
                    onClick={() => setKm(d)}
                    aria-pressed={km === d}
                    className={`rounded-full border px-3 py-1.5 text-sm ${km === d ? "border-orange-600 bg-orange-600 text-white" : "border-line-strong bg-surface"}`}
                  >
                    {d ? `${d} km` : t("Engin")}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex h-[52vh] flex-col overflow-hidden rounded-2xl border border-line">
            <LocationTree mode="multi" value={draft} onChange={setDraft} onNearMe={(postal) => setNear(postal)} />
          </div>
          <p className="text-xs text-stone-500">
            {draft.length ? t("Valið: {stadir}", { stadir: placesSummary(draft, t) }) : t("Ekkert valið: allt landið er sýnt.")}
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
