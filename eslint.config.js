import js from "@eslint/js";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";
import n from "eslint-plugin-n";
import perfectionist from "eslint-plugin-perfectionist";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import jsonc from "eslint-plugin-jsonc";
import markdown from "eslint-plugin-markdown";
import yml from "eslint-plugin-yml";

// tseslint's recommended set ships without a `files` scope, which would make
// it parse JSON/YAML/markdown as TypeScript. Scope it to source files.
const tsFiles = ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"];
const tsRecommended = tseslint.configs.recommended.map(config => ({
  ...config,
  files: tsFiles,
}));

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "src/lib/server/db/migrations/**",
      "pnpm-lock.yaml",
    ],
  },

  js.configs.recommended,
  ...tsRecommended,

  // TypeScript / React
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@stylistic": stylistic,
      node: n,
      perfectionist,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Style — the repo conventions (2-space, double quotes, semicolons)
      "@stylistic/indent": ["error", 2],
      "@stylistic/quotes": ["error", "double"],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
      "@stylistic/comma-dangle": ["error", "always-multiline"],

      // Imports auto-sorted (same convention as the old repo)
      "perfectionist/sort-imports": "error",

      // Correctness
      "no-console": "warn",
      "node/no-process-env": "error",
      "node/prefer-global/process": "error",
      // Next.js pages export route segment configs (metadata, dynamic)
      // alongside components by design — allow them explicitly.
      "react-refresh/only-export-components": [
        "warn",
        {
          allowExportNames: [
            "metadata",
            "dynamic",
            "revalidate",
            "generateMetadata",
            "generateStaticParams",
          ],
        },
      ],
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",

      // TypeScript
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },

  // JSON / JSONC — sorted keys (tsconfig, package.json, etc.)
  // The plugin's flat config wires its own parser (jsonc-eslint-parser).
  ...jsonc.configs["flat/recommended-with-json"],
  {
    files: ["**/*.json", "**/*.jsonc"],
    rules: {
      "jsonc/sort-keys": "error",
    },
  },
  {
    // pnpm rewrites package.json in its own conventional order on every
    // install — alphabetical sorting here would churn on every dependency change.
    files: ["package.json"],
    rules: {
      "jsonc/sort-keys": "off",
    },
  },
  {
    // VS Code settings are JSONC by design — comments are legal there.
    files: [".vscode/**/*.json"],
    rules: {
      "jsonc/no-comments": "off",
    },
  },

  // Markdown — lint fenced code blocks via the plugin's processor
  ...markdown.configs.recommended,

  // YAML — GitHub Actions workflows etc. (flat config wires yaml-eslint-parser)
  ...yml.configs["flat/recommended"],
  {
    files: ["**/*.yaml", "**/*.yml"],
    rules: {
      "yml/quotes": ["error", { prefer: "double" }],
    },
  },

  // Server-side files run in Node and log through pino
  {
    files: ["src/lib/server/**/*.ts", "src/instrumentation.ts"],
    rules: {
      "no-console": "off",
    },
  },

  // Tooling config files run in Node
  {
    files: ["*.js", "*.mjs", "*.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
);
