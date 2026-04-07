import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Legacy QHS (M13) — types Supabase générés sans Relationships,
  // `any` ponctuel accepté le temps de la migration. Ciblé uniquement
  // sur ces fichiers, jamais global.
  {
    files: [
      "src/lib/supabase/qhs/**",
      "src/lib/qhs/pdf-export.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
