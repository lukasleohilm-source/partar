// Merki Partar sem ImageResponse-efni (notað fyrir favicon, Apple- og PWA-tákn)
export function AppIcon({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ea580c",
        color: "white",
        fontSize: size * 0.62,
        fontWeight: 800,
        fontFamily: "sans-serif",
        letterSpacing: -size * 0.02,
      }}
    >
      P
    </div>
  );
}
