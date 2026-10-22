"use client";

import { useRef, useState } from "react";

// Myndasería sem flett er með fingri (scroll-snap), með teljara
export function ImageGallery({ urls, title }: { urls: string[]; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (!urls.length) {
    return <div className="flex aspect-[4/3] items-center justify-center bg-stone-200 text-5xl text-stone-400">🔧</div>;
  }

  function onScroll() {
    const el = ref.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function go(i: number) {
    const el = ref.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="relative bg-black">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- myndir þegar minnkaðar við upphleðslu
          <img
            key={url}
            src={url}
            alt={`${title} – mynd ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            className="size-full shrink-0 snap-center object-contain"
          />
        ))}
      </div>

      {urls.length > 1 && (
        <>
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            {index + 1}/{urls.length}
          </span>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Fyrri mynd"
            className="absolute left-2 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white disabled:invisible sm:flex"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === urls.length - 1}
            aria-label="Næsta mynd"
            className="absolute right-2 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white disabled:invisible sm:flex"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
