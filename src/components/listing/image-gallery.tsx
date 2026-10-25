"use client";

import { ChevronLeft, ChevronRight, Expand, Wrench, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { imageUrl, thumbUrl, type ImageRef } from "@/lib/listings";

// Myndasería sem flett er með fingri; smellur opnar myndir í fullri skjástærð
export function ImageGallery({ images, title }: { images: ImageRef[]; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState<number | null>(null);

  if (!images.length) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-stone-200 text-stone-400">
        <Wrench size={48} />
      </div>
    );
  }

  function go(i: number) {
    const el = ref.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div>
      <div className="relative">
        <div
          ref={ref}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <button
              key={img.path}
              type="button"
              onClick={() => setFull(i)}
              aria-label={`Opna mynd ${i + 1} í fullri stærð`}
              className="size-full shrink-0 snap-center"
              style={{ backgroundColor: img.color ?? "#1c1917" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- myndir þegar minnkaðar við upphleðslu */}
              <img
                src={imageUrl(img.path)}
                alt={`${title} – mynd ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="size-full object-contain"
              />
            </button>
          ))}
        </div>

        <span className="pointer-events-none absolute bottom-7 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
          <Expand size={12} /> {index + 1}/{images.length}
        </span>

        {images.length > 1 && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.map((img, i) => (
                <span
                  key={img.path}
                  className={`h-1.5 rounded-full bg-white shadow transition-all ${i === index ? "w-5 opacity-100" : "w-1.5 opacity-60"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label="Fyrri mynd"
              className="absolute left-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:invisible sm:flex"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === images.length - 1}
              aria-label="Næsta mynd"
              className="absolute right-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:invisible sm:flex"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {/* Smámyndir undir aðalmyndinni í tölvu */}
      {images.length > 1 && (
        <div className="hidden gap-2 overflow-x-auto bg-surface p-2 [scrollbar-width:thin] md:flex">
          {images.map((img, i) => (
            <button
              key={img.path}
              type="button"
              onClick={() => go(i)}
              aria-label={`Sýna mynd ${i + 1}`}
              className={`size-16 shrink-0 overflow-hidden rounded-xl ring-2 transition ${i === index ? "ring-orange-500" : "opacity-70 ring-transparent hover:opacity-100"}`}
              style={{ backgroundColor: img.color ?? "#1c1917" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- smámyndir þegar minnkaðar */}
              <img src={thumbUrl(img)} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {full !== null && <FullscreenViewer images={images} start={full} title={title} onClose={(i) => { setFull(null); go(i); }} />}
    </div>
  );
}

function FullscreenViewer({
  images,
  start,
  title,
  onClose,
}: {
  images: ImageRef[];
  start: number;
  title: string;
  onClose: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState<number | null>(null);
  const close = useCallback(() => onClose(index), [onClose, index]);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = start * el.clientWidth;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [start, close]);

  return (
    <div role="dialog" aria-modal aria-label={`${title} – myndir`} className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex items-center justify-between px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-white">
        <span className="text-sm font-medium">
          {index + 1} / {images.length}
        </span>
        <button type="button" onClick={close} aria-label="Loka" className="flex size-10 items-center justify-center rounded-full bg-white/15">
          <X size={22} />
        </button>
      </div>
      <div
        ref={ref}
        onScroll={(e) => {
          setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth));
          setZoomed(null);
        }}
        className={`flex flex-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${zoomed === null ? "overflow-x-auto" : "overflow-hidden"}`}
      >
        {images.map((img, i) => (
          <div
            key={img.path}
            className={`flex h-full w-full shrink-0 snap-center ${zoomed === i ? "overflow-auto" : "items-center justify-center overflow-hidden"}`}
            onDoubleClick={() => setZoomed(zoomed === i ? null : i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- myndir þegar minnkaðar við upphleðslu */}
            <img
              src={imageUrl(img.path)}
              alt={`${title} – mynd ${i + 1}`}
              className={zoomed === i ? "max-w-none w-[220%]" : "max-h-full max-w-full object-contain"}
            />
          </div>
        ))}
      </div>
      <p className="pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 text-center text-xs text-white/60">
        Tvísmelltu til að stækka
      </p>
    </div>
  );
}
