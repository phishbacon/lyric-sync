import antfu from "@antfu/eslint-config";

export default antfu({
  type: "app",
  svelte: true,
  typescript: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
    overrides: {
      "ts/no-unnecessary-type-arguments": ["error"],
      "ts/typedef": ["error", {
        variableDeclaration: true,
        parameter: true,
      }],
    },
  },
  formatters: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: "double",
  },
  ignores: ["**/migrations/*", ".github"],
}, {
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
});
