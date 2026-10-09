import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { INSTRUCTIONS } from "./instructions.js";
import { explainErrors } from "./tools/errors.js";
import { followTools } from "./tools/follow.js";
import { TOOLS } from "./tools/index.js";
import type { ToolContext } from "./tools/types.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "./version.js";

/** The MCP server with its instructions and tools, not yet connected to a transport. */
export function createServer(context: ToolContext): McpServer {
  const server = new McpServer({ name: PACKAGE_NAME, version: PACKAGE_VERSION }, { instructions: INSTRUCTIONS });
  // Errors explained outside following, so a tool's own error is explained too.
  explainErrors(server);
  followTools(server, context);
  for (const register of TOOLS) register(server, context);
  return server;
}
