import antfu from "@antfu/eslint-config";

export default antfu(
  {
    type: "app",
    svelte: true,
    stylistic: {
      indent: 2,
      semi: true,
      quotes: "double",
    },
    ignores: ["**/migrations/*", ".github"],
  },
  {
    rules: {
      "no-unused-vars": ["off"],
      "no-console": ["warn"],
      "antfu/no-top-level-await": ["off"],
      "node/prefer-global/process": ["off"],
      "node/no-process-env": ["error"],
      "perfectionist/sort-imports": ["error", {
        tsconfigRootDir: ".",
      }],
      "unicorn/filename-case": ["error", {
        case: "kebabCase",
        ignore: ["README.md", "\.svelte$"],
      }],
    },
  },
  {
    files: ["**/*.svelte"],
    rules: {
      "style/indent-binary-ops": "off",
    },
  },
);
