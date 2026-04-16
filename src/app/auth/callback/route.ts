import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Route de callback OAuth/PKCE pour Supabase Auth.
 *
 * Déclenchée après un clic sur un lien envoyé par Supabase
 * (password recovery, magic link, email confirmation).
 *
 * Flux :
 * 1. Supabase redirige ici avec `?code=XXX` (+ éventuellement `?next=/xxx`)
 * 2. On échange le code contre une session via exchangeCodeForSession()
 * 3. On redirige vers `next` (défaut: /tableau-de-bord)
 *
 * Pour le flow de password recovery, le paramètre `next` doit valoir
 * `/auth/update-password` — soit configuré côté Supabase dans le template
 * email, soit injecté ici automatiquement si `type=recovery` est présent.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const nextParam = searchParams.get("next");

  // Défaut : dashboard. Si recovery détecté, forcer update-password.
  let next = nextParam ?? "/tableau-de-bord";
  if (type === "recovery") {
    next = "/auth/update-password";
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/connexion?error=missing_auth_code`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/connexion?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
