import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Tenant logos may be hosted on arbitrary external domains selected by each salon.
  // Keep the native img element until logo uploads are moved to a controlled image host.
  {
    files: ["src/app/s/**/page.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // The shared appointment validator returns totalDuration for both create and update flows.
  // The create flow only consumes the derived endTime, while the update flow records duration in audit details.
  {
    files: ["src/features/appointments/actions.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^totalDuration$",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
