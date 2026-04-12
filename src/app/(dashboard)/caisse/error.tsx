"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CaisseError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Caisse] Erreur non gérée :", error);
  }, [error]);

  return (
    <div
      style={{ fontFamily: "Inter, sans-serif" }}
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: "#FEE9E0" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E85D26"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>

        <h1
          className="text-xl font-semibold"
          style={{ color: "#2D3436" }}
        >
          Erreur — Module Caisse
        </h1>

        <p className="max-w-sm text-sm" style={{ color: "#636e72" }}>
          Le module caisse a rencontré une erreur. Aucune transaction n&apos;a
          été affectée. Réessayez ou contactez le support si le problème
          persiste.
        </p>

        {error.digest && (
          <p className="text-xs" style={{ color: "#b2bec3" }}>
            Référence : {error.digest}
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg px-6 font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{
            backgroundColor: "#E85D26",
            minHeight: "44px",
            minWidth: "44px",
          }}
        >
          Réessayer
        </button>

        <a
          href="/tableau-de-bord"
          className="rounded-lg border px-6 font-medium transition-colors hover:bg-gray-50"
          style={{
            borderColor: "#2D3436",
            color: "#2D3436",
            minHeight: "44px",
            minWidth: "44px",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Tableau de bord
        </a>
      </div>
    </div>
  );
}
