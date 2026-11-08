import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "docs/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  {
    // stdout is the MCP channel: anything printed there corrupts the protocol.
    files: ["src/**/*.ts"],
    rules: { "no-console": ["error", { allow: ["error"] }] },
  },
  {
    // Tools reach the driver through src/driver.ts, which records each call's page (_meta.page, follow mode).
    files: ["src/tools/**/*.ts"],
    rules: { "no-restricted-imports": ["error", { paths: [{ name: "@falkenslab/moodle-driver", message: "Import the driver from ../driver.js: it records each call's page." }] }] },
  },
);
