"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Met à jour le mot de passe de l'utilisateur courant.
 * Prérequis : l'utilisateur doit avoir une session active (recovery code
 * déjà échangé par /auth/callback, ou user connecté volontairement).
 */
export async function updatePassword(newPassword: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Session expirée. Merci de recommencer la procédure de réinitialisation.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/tableau-de-bord");
}
