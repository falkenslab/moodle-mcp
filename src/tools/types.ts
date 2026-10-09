import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BrowserManager } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";

/** What every tool gets: the configuration and the shared browser. */
export interface ToolContext {
  config: Config;
  browser: BrowserManager;
}

/** Registers one tool on the server (one per file in `src/tools/`). */
export type RegisterTool = (server: McpServer, context: ToolContext) => void;
