// eslint.config.js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import jestPlugin from "eslint-plugin-jest";

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**"],
  },
  ...tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        globals: {
          console: "readonly",
          process: "readonly",
          fetch: "readonly",
          setTimeout: "readonly",
          clearTimeout: "readonly",
          module: "readonly",
          require: "readonly",
          __dirname: "readonly",
          Buffer: "readonly",
        },
      },
      plugins: {
        jest: jestPlugin,
      },
      rules: {
        indent: ["error", 2],
        "linebreak-style": ["error", "unix"],
        quotes: ["error", "double"],
        semi: ["error", "always"],
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["error"],
        "@typescript-eslint/no-explicit-any": "off",
        "no-undef": ["error"],
      },
    },
    {
      files: [
        "**/*.test.ts",
        "**/*.test.js",
        "**/tests/**/*.ts",
        "**/tests/**/*.js",
      ],
      languageOptions: {
        globals: {
          describe: "readonly",
          beforeEach: "readonly",
          afterEach: "readonly",
          beforeAll: "readonly",
          afterAll: "readonly",
          it: "readonly",
          test: "readonly",
          expect: "readonly",
          jest: "readonly",
          Response: "readonly",
          RequestInit: "readonly",
          RequestInfo: "readonly",
          URL: "readonly",
          global: "readonly",
        },
      },
      plugins: {
        jest: jestPlugin,
      },
      rules: {
        ...jestPlugin.configs.recommended.rules,
        "jest/no-conditional-expect": "warn",
        "jest/expect-expect": [
          "warn",
          { assertFunctionNames: ["expect", "assert*"] },
        ],
        "@typescript-eslint/no-unused-vars": ["warn"],
        "@typescript-eslint/no-unsafe-function-type": "off",
        "no-undef": "off",
      },
    }
  ),
];
