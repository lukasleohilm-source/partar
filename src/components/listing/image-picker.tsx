"use client";

import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { processImage, type PickedImage, type ProcessedImage } from "@/lib/images";
import { ImageEnhancer } from "./image-enhancer";
import { useT } from "@/components/lang-provider";

export const MAX_IMAGES = 10;

type Props = {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
};

export function ImagePicker({ images, onChange }: Props) {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PickedImage | null>(null);
  // Upprunalegar myndir (fyrir ✨-bætur), svo endurtekin vinnsla rýri ekki gæðin
  const originals = useRef(new Map<string, Blob>());

  async function handleFiles(list: FileList | File[] | null) {
    // Aðeins myndir (dregið inn getur líka innihaldið PDF, Word o.fl.)
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!files.length) {
      if (list?.length) setError(t("Aðeins myndir eru leyfðar."));
      return;
    }
    setError(null);
    setBusy(true);
    const room = MAX_IMAGES - images.length;
    const picked = files.slice(0, room);
    const added: PickedImage[] = [];
    for (const file of picked) {
      try {
        added.push(await processImage(file));
      } catch {
        setError(t("Ekki tókst að lesa {skra}. Prófaðu aðra mynd.", { skra: file.name }));
      }
    }
    if (files.length > room) setError(t("Hámark {n} myndir.", { n: MAX_IMAGES }));
    onChange([...images, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Draga og sleppa: myndir dregnar úr Downloads, möppu eða öðrum glugga
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  // Mynd sem er sleppt utan reitsins á ekki að opnast í vafranum (og yfirgefa formið);
  // Ctrl+V límir inn mynd af klippiborðinu
  useEffect(() => {
    const block = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const paste = (e: ClipboardEvent) => {
      const pasted = Array.from(e.clipboardData?.files ?? []);
      if (pasted.length) {
        e.preventDefault();
        void handleFiles(pasted);
      }
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
      window.removeEventListener("paste", paste);
    };
  });

  function applyEnhanced(result: ProcessedImage, original: Blob) {
    if (!editing) return;
    originals.current.set(result.id, original);
    if (editing.source === "new") URL.revokeObjectURL(editing.url);
    onChange(images.map((i) => (i.id === editing.id ? result : i)));
    setEditing(null);
  }

  function remove(id: string) {
    const img = images.find((i) => i.id === id);
    if (img?.source === "new") URL.revokeObjectURL(img.url);
    onChange(images.filter((i) => i.id !== id));
  }

  function move(index: number, delta: number) {
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  }

  return (
    <div
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (images.length < MAX_IMAGES) void handleFiles(e.dataTransfer.files);
        else setError(t("Hámark {n} myndir.", { n: MAX_IMAGES }));
      }}
      className={`relative rounded-2xl transition ${dragging ? "bg-orange-500/10 outline-2 outline-dashed outline-offset-4 outline-orange-500" : ""}`}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-orange-500/10 backdrop-blur-[1px]">
          <span className="flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 font-semibold text-white shadow-lg">
            <ImagePlus size={20} /> {t("Slepptu myndunum hér")}
          </span>
        </div>
      )}
      <ul className="grid grid-cols-3 gap-2">
        {images.map((img, i) => (
          <li key={img.id} className="relative aspect-square overflow-hidden rounded-xl bg-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element -- object URL, ekki hægt að nota next/image */}
            <img src={img.url} alt={`Mynd ${i + 1}`} className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                {t("Forsíðumynd")}
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(img.id)}
              aria-label={t("Eyða mynd {n}", { n: i + 1 })}
              className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X size={16} />
            </button>
            <div className="absolute inset-x-1 bottom-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={t("Færa framar")}
                className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white disabled:invisible"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setEditing(img)}
                aria-label={t("Gera mynd {n} flottari", { n: i + 1 })}
                className="flex h-7 items-center gap-1 rounded-full bg-orange-600 px-2.5 text-xs font-bold text-white shadow active:scale-95"
              >
                <Sparkles size={14} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === images.length - 1}
                aria-label={t("Færa aftar")}
                className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white disabled:invisible"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </li>
        ))}

        {images.length < MAX_IMAGES && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 bg-surface text-stone-500 active:bg-stone-100"
            >
              {busy ? <Loader2 size={28} className="animate-spin" /> : <ImagePlus size={30} strokeWidth={1.8} />}
              <span className="text-xs">{busy ? t("Vinn myndir") : t("Bæta við")}</span>
              {!busy && <span className="hidden px-2 text-center text-[11px] leading-tight text-stone-400 md:block">{t("eða dragðu myndir hingað")}</span>}
            </button>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="mt-2 text-sm text-stone-500">
        {images.length}/{MAX_IMAGES}{" "}{t("myndir. Fyrsta myndin birtist í leitarniðurstöðum.")}
      </p>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      {images.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
          <Sparkles size={14} className="text-orange-600" /> {t("Ýttu á ✨ til að lagfæra birtu og liti.")}
        </p>
      )}

      <ImageEnhancer
        image={editing}
        original={editing ? (originals.current.get(editing.id) ?? (editing.source === "new" ? editing.blob : null)) : null}
        onClose={() => setEditing(null)}
        onApply={applyEnhanced}
      />
    </div>
  );
}
