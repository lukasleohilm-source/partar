"use client";

import { useEffect, useRef, useState } from "react";
import type { WheelScene } from "./wheel-scene";

// Þrívíddarfelgan á forsíðunni. Aðeins í tölvu: Three.js er hlaðið eftir að síðan er komin upp,
// hreyfingin stöðvast þegar felgan sést ekki og "minni hreyfing" fær kyrra mynd.
export function WheelHero({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !window.matchMedia("(min-width: 768px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scene: WheelScene | null = null;
    let visible = true;
    let cancelled = false;

    const sync = () => {
      if (!scene) return;
      if (visible && !document.hidden) scene.start();
      else scene.stop();
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);

    const load = () =>
      import("./wheel-scene").then(({ createWheelScene }) => {
        if (cancelled) return;
        try {
          scene = createWheelScene(canvas, { animate: !reduce });
        } catch {
          return; // ekkert WebGL: síðan virkar áfram án felgunnar
        }
        scene.renderOnce();
        setReady(true);
        sync();
      });
    const idle = setTimeout(load, 300);

    return () => {
      cancelled = true;
      clearTimeout(idle);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      scene?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`size-full transition-opacity duration-1000 ease-out ${ready ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}
