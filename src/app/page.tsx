import { redirect } from "next/navigation";

/**
 * Page racine.
 *
 * Redirige par défaut vers le dashboard. Si des paramètres d'auth Supabase
 * sont présents dans l'URL (?code=…&type=…), les forwarde vers /auth/callback
 * pour que le code PKCE soit échangé contre une session.
 *
 * Cas d'usage : les liens email Supabase (recovery, magic link, confirmation)
 * arrivent par défaut sur `{SITE_URL}/?code=XXX`. Sans forward, le middleware
 * redirige vers /connexion et le code est perdu.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  if (params.code) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") qs.set(key, value);
    }
    redirect(`/auth/callback?${qs.toString()}`);
  }

  redirect("/tableau-de-bord");
}
