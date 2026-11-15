"use client";

import { ChevronRight, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PlaceList } from "@/components/place-picker";
import { labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { POSTAL, postalRegion } from "@/lib/places";
import { DISTANCES, serializeMyPlace } from "@/lib/search";
import { useT } from "@/components/lang-provider";

// „Minn staður“: póstnúmer notanda (eða GPS) fyrir fjarlægð og röðun „Næst mér“
export function MyPlacePicker({ place, maxKm }: { place: string | null; maxKm?: number }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [postal, setPostal] = useState(place ?? "");
  const [km, setKm] = useState<number | undefined>(maxKm);
  const name = place ? POSTAL[place]?.[0] : null;

  function apply(nextPlace: string | null, nextKm: number | undefined) {
    document.cookie = serializeMyPlace(nextPlace);
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("sida");
    if (nextPlace && nextKm) url.searchParams.set("innan", String(nextKm));
    else url.searchParams.delete("innan");
    if (nextPlace && !url.searchParams.get("rodun")) url.searchParams.set("rodun", "distance");
    if (!nextPlace && url.searchParams.get("rodun") === "distance") url.searchParams.delete("rodun");
    router.replace(url.pathname + url.search);
    router.refresh();
  }

  const valid = /^\d{3}$/.test(postal) && POSTAL[postal];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5 active:scale-95"
      >
        <MapPin size={16} className="text-orange-600" />
        {name ? `${name}${maxKm ? ` · innan ${maxKm} km` : ""}` : t("Staðsetning")}
        <ChevronRight size={15} className="text-stone-400" />
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("Minn staður")}
        footer={
          <div className="space-y-2">
            <button type="button" disabled={!valid} onClick={() => apply(postal, km)} className={primaryButton}>
              {t("Sýna næst mér")}
            </button>
            {place && (
              <button type="button" onClick={() => apply(null, undefined)} className={secondaryButton}>
                {t("Fjarlægja staðsetningu")}
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {/* Sama staðsetningarval og þegar auglýsing er sett inn: leit, Nálægt mér, landshlutar → bæir */}
          <div className="flex h-[44vh] flex-col overflow-hidden rounded-2xl border border-line">
            <PlaceList
              value={valid ? { region: postalRegion(postal), postal } : null}
              allowAll
              allowRegion={false}
              onSelect={(p) => (p?.postal ? setPostal(p.postal) : apply(null, undefined))}
            />
          </div>
          {valid && (
            <p className="flex items-center gap-1.5 text-sm text-stone-700">
              <MapPin size={15} className="text-orange-600" /> {POSTAL[postal][0]} · {postal}
            </p>
          )}
          <fieldset>
            <legend className={labelClass}>{t("Hámarksfjarlægð")}</legend>
            <div className="flex flex-wrap gap-2">
              {[undefined, ...DISTANCES].map((d) => (
                <button
                  key={d ?? "allt"}
                  type="button"
                  onClick={() => setKm(d)}
                  aria-pressed={km === d}
                  className={`rounded-full border px-3.5 py-2 text-sm ${km === d ? "border-orange-600 bg-orange-600 text-white" : "border-stone-300 bg-surface"}`}
                >
                  {d ? `${d} km` : t("Allt landið")}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-stone-500">{t("Fjarlægð er reiknuð út frá póstnúmeri auglýsingar (annars landshluta) og er áætluð.")}</p>
        </div>
      </BottomSheet>
    </>
  );
}
