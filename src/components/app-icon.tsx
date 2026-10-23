import { NUT_PATH } from "./logo";

// Tákn appsins sem ImageResponse-efni (favicon, Apple- og PWA-tákn). Satori styður SVG.
export function AppIcon({ size, maskable = false }: { size: number; maskable?: boolean }) {
  // Á „maskable“ táknum klippir síminn brúnirnar af, svo róin er minnkuð
  const inner = maskable ? 0.62 : 0.86;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #fb923c, #ea580c)",
      }}
    >
      <svg width={size * inner} height={size * inner} viewBox="0 0 100 100">
        <path d={NUT_PATH} fill="#fff" fillRule="evenodd" />
      </svg>
    </div>
  );
}
