"use server";

// Server actions M12 Documents & Conformité.
// Stub initial pour Task 3 — sera enrichi dans Tasks 4/5/8.

export async function triggerExpirationCheck(): Promise<{
  ok: boolean;
  checked: number;
  created: number;
  error?: string;
}> {
  // Stub : la vraie implémentation invoquera l'edge function
  // documents-check-expirations dans Task 8.
  return { ok: true, checked: 0, created: 0 };
}
