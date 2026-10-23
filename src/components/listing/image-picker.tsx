"use client";

import { useRef, useState } from "react";
import { processImage, type PickedImage } from "@/lib/images";

export const MAX_IMAGES = 10;

type Props = {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
};

export function ImagePicker({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const room = MAX_IMAGES - images.length;
    const picked = Array.from(files).slice(0, room);
    const added: PickedImage[] = [];
    for (const file of picked) {
      try {
        added.push(await processImage(file));
      } catch {
        setError(`Ekki tókst að lesa ${file.name}. Prófaðu aðra mynd.`);
      }
    }
    if (files.length > room) setError(`Hámark ${MAX_IMAGES} myndir.`);
    onChange([...images, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
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
    <div>
      <ul className="grid grid-cols-3 gap-2">
        {images.map((img, i) => (
          <li key={img.id} className="relative aspect-square overflow-hidden rounded-xl bg-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element -- object URL, ekki hægt að nota next/image */}
            <img src={img.url} alt={`Mynd ${i + 1}`} className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                Forsíðumynd
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(img.id)}
              aria-label={`Eyða mynd ${i + 1}`}
              className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
            >
              ✕
            </button>
            <div className="absolute inset-x-1 bottom-1 flex justify-between">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Færa framar"
                className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white disabled:invisible"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === images.length - 1}
                aria-label="Færa aftar"
                className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white disabled:invisible"
              >
                ›
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
              <span className="text-3xl leading-none">{busy ? "…" : "📷"}</span>
              <span className="text-xs">{busy ? "Vinn myndir" : "Bæta við"}</span>
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
        {images.length}/{MAX_IMAGES} myndir. Fyrsta myndin birtist í leitarniðurstöðum.
      </p>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
