import { z } from "zod";
import { redactUrl } from "../config.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";
import type { RegisterTool, ToolContext } from "./types.js";

const outputSchema = {
  name: z.string(),
  version: z.string(),
  moodleUrl: z.string().describe("The Moodle site, without credentials"),
  profileDir: z.string().describe("The browser's persistent profile folder"),
  channel: z.string().describe('The configured browser: "msedge", "chrome" or "auto" (Edge, then Chrome)'),
  headless: z.boolean(),
  browserOpen: z.boolean().describe("Whether the browser is running"),
  openChannel: z.string().optional().describe("The browser actually running, if any"),
  node: z.string(),
};

export type ServerInfo = z.infer<z.ZodObject<typeof outputSchema>>;

/** The effective configuration, without secrets (ADR-003). Never launches the browser. */
export function serverInfo({ config, browser }: ToolContext): ServerInfo {
  const openChannel = browser.openChannel();
  return {
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    moodleUrl: redactUrl(config.moodleUrl),
    profileDir: config.profileDir,
    channel: config.channel ?? "auto",
    headless: config.headless,
    browserOpen: openChannel !== undefined,
    openChannel,
    node: process.version,
  };
}

export const registerServerInfo: RegisterTool = (server, context) => {
  server.registerTool(
    "server_info",
    {
      title: "Server info",
      description: "Show this server's version and effective configuration: the Moodle site, the browser profile folder and the browser. Contains no secrets. Does not open the browser.",
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => {
      const info = serverInfo(context);
      return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }], structuredContent: info };
    },
  );
};
