"use client";

import { Loader2, Sparkles, Sun, Eraser } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/lang-provider";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { enhanceImage, processImage, removeBackground, type PickedImage, type ProcessedImage } from "@/lib/images";
import { reportError } from "@/lib/report-error";

// Hvítur bakgrunnur þarf Cloudflare Image Transformations á lukels255.com; falið þar til kveikt er á því
const BACKGROUND_REMOVAL = false;

type Props = {
  image: PickedImage | null;
  // Upprunalega myndin (fyrir bætur), svo hægt sé að skipta um skoðun án þess að gæðin rýrni
  original: Blob | null;
  onClose: () => void;
  onApply: (result: ProcessedImage, original: Blob) => void;
};

// ✨ Gera myndina flottari: sjálfvirk birta og litir, og hvítur bakgrunnur (Cloudflare fjarlægir bakgrunninn)
export function ImageEnhancer({ image, original, onClose, onApply }: Props) {
  const { t } = useT();
  const [light, setLight] = useState(false);
  const [white, setWhite] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = useRef<Blob | null>(null);
  const cutout = useRef<Blob | null>(null); // geymt svo bakgrunnur sé aðeins fjarlægður einu sinni

  // Ný mynd valin: byrja upp á nýtt
  useEffect(() => {
    setLight(false);
    setWhite(false);
    setError(null);
    setResult(null);
    cutout.current = null;
    base.current = original;
    if (!image) return;
    if (!original) {
      // Mynd sem er þegar vistuð: sótt úr geymslunni
      fetch(image.url)
        .then((r) => r.blob())
        .then((b) => (base.current = b))
        .catch(() => {});
    }
    setPreview(image.url);
  }, [image, original]);

  useEffect(() => {
    if (!image) return;
    let cancelled = false;
    (async () => {
      if (!light && !white) {
        setResult(null);
        setPreview(image.url);
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const src = base.current ?? (await (await fetch(image.url)).blob());
        let out = src;
        if (white) {
          cutout.current ??= await removeBackground(src);
          out = cutout.current;
        }
        if (light) out = await enhanceImage(out);
        if (cancelled) return;
        setResult(out);
        setPreview((old) => {
          if (old && old !== image.url) URL.revokeObjectURL(old);
          return URL.createObjectURL(out);
        });
      } catch (e) {
        if (cancelled) return;
        reportError(e, "image-enhancer");
        if (white) {
          setWhite(false);
          setError(t("Ekki tókst að fjarlægja bakgrunninn. Prófaðu aftur eða aðra mynd."));
        } else setError(t("Ekki tókst að lagfæra myndina."));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [light, white, image, t]);

  async function apply() {
    if (!result || !base.current) return onClose();
    setBusy(true);
    try {
      onApply(await processImage(result), base.current);
    } finally {
      setBusy(false);
    }
  }

  const toggle = (on: boolean, set: (v: boolean) => void, Icon: typeof Sun, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => set(!on)}
      disabled={busy}
      aria-pressed={on}
      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition disabled:opacity-60 ${
        on ? "bg-orange-500/10 ring-orange-400" : "bg-surface ring-line"
      }`}
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? "bg-orange-600 text-white" : "bg-stone-500/15 text-stone-600"}`}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-stone-900">{label}</span>
        <span className="block text-xs text-stone-500">{hint}</span>
      </span>
      <span className={`h-6 w-10 shrink-0 rounded-full p-0.5 transition ${on ? "bg-orange-600" : "bg-stone-300"}`}>
        <span className={`block size-5 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );

  return (
    <BottomSheet
      open={Boolean(image)}
      onClose={onClose}
      title={t("Gera myndina flottari")}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t("Hætta við")}
          </button>
          <button type="button" onClick={apply} disabled={busy || !result} className={primaryButton}>
            {t("Nota")}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-200">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL */}
          {preview && <img src={preview} alt={t("Forskoðun")} className="size-full object-contain" />}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-black/35 text-white">
              <span className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold">
                <Loader2 size={18} className="animate-spin" /> {white ? t("Fjarlægi bakgrunn…") : t("Lagfæri…")}
              </span>
            </div>
          )}
          {!busy && result && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-1 text-xs font-bold text-white">
              <Sparkles size={13} /> {t("Forskoðun")}
            </span>
          )}
        </div>
        {toggle(light, setLight, Sun, t("Lagfæra birtu og liti"), t("Lýsir dökkar myndir og lagar gulleita birtu"))}
        {BACKGROUND_REMOVAL && toggle(white, setWhite, Eraser, t("Hvítur bakgrunnur"), t("Fjarlægir bakgrunninn, eins og í vefverslun"))}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
