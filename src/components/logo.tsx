// Merki Partar: sexkantuð ró (varahlutur) á appelsínugulum grunni

export const NUT_PATH =
  "M50 18 L77.7 34 L77.7 66 L50 82 L22.3 66 L22.3 34 Z M50 38 a12 12 0 1 0 0.001 0 Z";

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
      <rect width="100" height="100" rx="24" fill="#e0560f" />
      <path d={NUT_PATH} fill="#fff" fillRule="evenodd" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={28} />
      <span className="text-[21px] font-semibold tracking-[-0.03em] text-stone-900">
        Partar<span className="text-orange-600">.</span>
      </span>
    </span>
  );
}
