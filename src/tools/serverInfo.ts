import { z } from "zod";
import { redactUrl } from "../config.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";
import type { RegisterTool, ToolContext } from "./types.js";

const source = z.enum(["configure", "argument", "environment", "default"]);

export const serverInfoSchema = {
  name: z.string(),
  version: z.string(),
  moodleUrl: z.string().optional().describe("The Moodle site, without credentials; missing until configured"),
  profileDir: z.string().describe("The browser's persistent profile folder"),
  channel: z.string().describe('The configured browser: "msedge", "chrome" or "auto" (Edge, then Chrome)'),
  headless: z.boolean(),
  sources: z
    .object({ moodleUrl: source.optional(), profileDir: source, channel: source, headless: source })
    .describe("Where each setting came from: configure, argument, environment or default"),
  browserOpen: z.boolean().describe("Whether the browser is running"),
  openChannel: z.string().optional().describe("The browser actually running, if any"),
  node: z.string(),
};

export type ServerInfo = z.infer<z.ZodObject<typeof serverInfoSchema>>;

/** The effective configuration, without secrets (ADR-003). Never launches the browser. */
export function serverInfo({ config, browser }: ToolContext): ServerInfo {
  const openChannel = browser.openChannel();
  return {
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    moodleUrl: config.moodleUrl ? redactUrl(config.moodleUrl) : undefined,
    profileDir: config.profileDir,
    channel: config.channel ?? "auto",
    headless: config.headless,
    sources: { ...config.sources },
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
      description: "Show this server's version and effective configuration: the Moodle site, the browser profile folder, the browser, and where each setting came from. Contains no secrets. Does not open the browser.",
      outputSchema: serverInfoSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => {
      const info = serverInfo(context);
      return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }], structuredContent: info };
    },
  );
};
