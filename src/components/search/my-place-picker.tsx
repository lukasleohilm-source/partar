"use client";

import { ChevronRight, LocateFixed, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { inputClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { POSTAL, nearestPostal } from "@/lib/places";
import { DISTANCES, serializeMyPlace } from "@/lib/search";
import { useT } from "@/components/lang-provider";

// „Minn staður“: póstnúmer notanda (eða GPS) fyrir fjarlægð og röðun „Næst mér“
export function MyPlacePicker({ place, maxKm }: { place: string | null; maxKm?: number }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [postal, setPostal] = useState(place ?? "");
  const [km, setKm] = useState<number | undefined>(maxKm);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  function locate() {
    if (!navigator.geolocation) return setError(t("Tækið styður ekki staðsetningu."));
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPostal(nearestPostal(pos.coords.latitude, pos.coords.longitude));
        setLocating(false);
      },
      () => {
        setError(t("Ekki fékkst leyfi til að sjá staðsetningu."));
        setLocating(false);
      },
      { maximumAge: 600_000, timeout: 10_000 },
    );
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
          <button type="button" onClick={locate} disabled={locating} className={`${secondaryButton} flex items-center justify-center gap-2`}>
            {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}{" "}{t("Nota staðsetningu símans")}
          </button>
          <label className="block">
            <span className={labelClass}>{t("eða póstnúmer")}</span>
            <input
              value={postal}
              onChange={(e) => setPostal(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              placeholder="t.d. 800"
              className={inputClass}
            />
            {postal.length === 3 && (
              <span className={`mt-1 block text-sm ${valid ? "text-stone-600" : "text-red-600"}`}>
                {valid ? POSTAL[postal][0] : t("Óþekkt póstnúmer")}
              </span>
            )}
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
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
