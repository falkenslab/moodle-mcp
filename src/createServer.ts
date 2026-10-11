import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { instructionsFor } from "./instructions.js";
import { explainErrors } from "./tools/errors.js";
import { followTools } from "./tools/follow.js";
import { TOOLS } from "./tools/index.js";
import { SCOPES, applyScopes, describeLimits, scopeTools } from "./tools/scopes.js";
import type { ToolContext } from "./tools/types.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "./version.js";

/** The MCP server with its instructions and tools, not yet connected to a transport. */
export function createServer(context: ToolContext): McpServer {
  const { config } = context;
  const restricted = config.scopes.length < SCOPES.length || config.studentData === "block";
  const server = new McpServer({ name: PACKAGE_NAME, version: PACKAGE_VERSION }, { instructions: instructionsFor({ restricted, description: describeLimits(config) }) });
  // Errors explained outside following, so a tool's own error is explained too.
  explainErrors(server);
  followTools(server, context);
  // Installed last, so it wraps the others: a tool outside the scopes is refused before anything runs.
  scopeTools(server, config);
  for (const register of TOOLS) register(server, context);
  // Out of scope means absent: hidden from the list before any client sees it (ADR-015).
  applyScopes(server, config);
  return server;
}
