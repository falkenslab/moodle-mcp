// The entry point and the bundle's (dist/server.mjs): configuration, stdio, shutdown.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBrowserManager } from "./browser.js";
import { ConfigError, USAGE, loadConfig } from "./config.js";
import { createServer } from "./createServer.js";
import { PACKAGE_VERSION } from "./version.js";

async function main(): Promise<void> {
  const config = loadConfig(process.argv.slice(2), process.env);
  // stdout is free here: the MCP session hasn't started.
  if (config === "help") return void process.stdout.write(`${USAGE}\n`);
  if (config === "version") return void process.stdout.write(`${PACKAGE_VERSION}\n`);

  const browser = createBrowserManager(config);
  const server = createServer({ config, browser });

  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    await browser.close();
    await server.close().catch(() => undefined);
    process.exit(0);
  };
  // The client ends the session by closing stdin or by a signal.
  process.stdin.on("close", shutdown);
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await server.connect(new StdioServerTransport());
  const site = config.moodleUrl ? new URL(config.moodleUrl).origin : "no site yet (configure)";
  console.error(`moodle-mcp ${PACKAGE_VERSION} running on stdio for ${site}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof ConfigError ? `moodle-mcp: ${error.message}` : error);
  process.exit(1);
});
