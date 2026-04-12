"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Dashboard] Erreur non gérée :", error);
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1
          className="text-xl font-semibold"
          style={{ color: "#2D3436" }}
        >
          Une erreur est survenue
        </h1>

        <p className="max-w-sm text-sm" style={{ color: "#636e72" }}>
          Une erreur inattendue s&apos;est produite. Veuillez réessayer ou
          contacter le support si le problème persiste.
        </p>

        {error.digest && (
          <p className="text-xs" style={{ color: "#b2bec3" }}>
            Référence : {error.digest}
          </p>
        )}
      </div>

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
    </div>
  );
}
