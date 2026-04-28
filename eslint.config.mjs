import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  globalIgnores([
    "dist/**",
    "node_modules/**",
    "**/*.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "public/**",
    "videos/**",
    ".agents/**",
  ]),
]);

export default eslintConfig;
