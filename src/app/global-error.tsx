"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

// Villa í rótarútlitinu sjálfu: einföld síða án hönnunarkerfis
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, "global");
  }, [error]);

  return (
    <html lang="is">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "96px 24px", background: "#f4f3f1" }}>
        <h1 style={{ fontSize: 22 }}>Eitthvað fór úrskeiðis</h1>
        <p style={{ color: "#57534e" }}>Villan hefur verið skráð.</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: 16, padding: "12px 20px", borderRadius: 12, border: 0, background: "#ea580c", color: "#fff", fontWeight: 600 }}
        >
          Reyna aftur
        </button>
      </body>
    </html>
  );
}
