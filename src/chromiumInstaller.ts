import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

export type InstallChromium = () => Promise<void>;

/**
 * Downloads the Chromium this `playwright-core` expects with its own CLI (ADR-001), into
 * `PLAYWRIGHT_BROWSERS_PATH` when set, else the user's `ms-playwright` cache. The CLI is in
 * `node_modules` because `playwright-core` stays outside the bundle (ADR-005).
 */
export const installChromium: InstallChromium = () =>
  new Promise((resolve, reject) => {
    const cli = path.join(path.dirname(createRequire(import.meta.url).resolve("playwright-core/package.json")), "cli.js");
    // --no-shell: the server launches full Chromium headless too (channel "chromium").
    // --no-remove: the cache is shared, and other installations' browsers aren't ours to remove.
    const child = spawn(process.execPath, [cli, "install", "chromium", "--no-shell", "--no-remove", "--no-progress"], { stdio: ["ignore", "pipe", "pipe"] });
    // stdout belongs to the MCP protocol: whatever the installer prints goes to stderr.
    child.stdout.pipe(process.stderr, { end: false });
    child.stderr.pipe(process.stderr, { end: false });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Chromium's installer exited with code ${code}`))));
  });
