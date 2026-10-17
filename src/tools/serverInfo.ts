import { chromium } from "playwright-core";
import { z } from "zod";
import { redactUrl } from "../config.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";
import { ROLES } from "./roles.js";
import { ACCESS_LEVELS, SCOPES, STUDENT_DATA_LEVELS, activeScopes } from "./scopes.js";
import type { RegisterTool, ToolContext } from "./types.js";

const source = z.enum(["configure", "argument", "environment", "default"]);

export const serverInfoSchema = {
  name: z.string(),
  version: z.string(),
  moodleUrl: z.string().optional().describe("The active Moodle site, without credentials; missing until configured"),
  site: z.string().optional().describe("The active site's name (list_sites); missing until there's a site"),
  sites: z.array(z.string()).describe("Every site's name; use_site switches"),
  dataDir: z.string().describe("The server's data folder: the sites added at run time, and the profiles of every site but the first"),
  profileDir: z.string().describe("The browser's persistent profile folder"),
  channel: z.string().describe('The configured browser: "msedge", "chrome", "chromium" or "auto" (Edge, then Chrome, then the downloaded Chromium)'),
  headless: z.boolean(),
  downloadBrowser: z.boolean().describe("Whether Chromium may be downloaded when no system browser is found"),
  trail: z.enum(["realistic", "fast"]).describe("How student tools view and do things: through the real pages at a human pace, or as fast as possible"),
  scopes: z.array(z.enum(SCOPES)).describe("The kinds of tools in force (ADR-015), student data's blocks applied"),
  studentData: z.enum(STUDENT_DATA_LEVELS).describe("How others' data reaches the agent: block (no tools on it), pseudonymize or clear (ADR-016)"),
  role: z.enum(ROLES).describe("The role whose tools the agent gets: teacher, student or all (ADR-018)"),
  access: z.enum(ACCESS_LEVELS).describe("read: only the tools that change nothing in Moodle; write: all (ADR-020)"),
  sources: z
    .object({ moodleUrl: source.optional(), profileDir: source, channel: source, headless: source, downloadBrowser: source, trail: source, scopes: source, studentData: source, role: source, access: source })
    .describe("Where each setting came from: configure, argument, environment or default"),
  unexpanded: z.array(z.string()).optional().describe("Settings the client passed as unexpanded ${…} placeholders (its plugin settings missing), taken as not set: their defaults apply"),
  visible: z.boolean().describe("Whether the browser shows a window and follows the tools in it (show_browser), over headless"),
  browserOpen: z.boolean().describe("Whether the browser is running"),
  openChannel: z.string().optional().describe("The browser actually running, if any"),
  chromiumPath: z.string().optional().describe("Where the downloaded Chromium is, when it's the one running"),
  chromiumDownload: z.enum(["downloading", "failed"]).optional().describe("Whether Chromium is being downloaded, or the last download failed"),
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
    site: config.activeSite,
    sites: config.sites.map((s) => s.name),
    dataDir: config.dataDir,
    profileDir: config.profileDir,
    channel: config.channel ?? "auto",
    headless: config.headless,
    downloadBrowser: config.downloadBrowser,
    trail: config.trail,
    scopes: [...activeScopes(config)],
    studentData: config.studentData,
    role: config.role,
    access: config.access,
    sources: { ...config.sources },
    ...(config.unexpanded && { unexpanded: config.unexpanded }),
    visible: browser.visible(),
    browserOpen: openChannel !== undefined,
    openChannel,
    chromiumPath: openChannel === "chromium" ? chromium.executablePath() : undefined,
    chromiumDownload: browser.chromiumDownload(),
    node: process.version,
  };
}

export const registerServerInfo: RegisterTool = (server, context) => {
  server.registerTool(
    "server_info",
    {
      title: "Server info",
      description: "Show this server's version and effective configuration: the active Moodle site and the others, the browser profile folder, the browser, and where each setting came from. Contains no secrets. Does not open the browser.",
      outputSchema: serverInfoSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => {
      const info = serverInfo(context);
      return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }], structuredContent: info };
    },
  );
};
