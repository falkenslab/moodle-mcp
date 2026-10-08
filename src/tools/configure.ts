import { z } from "zod";
import { parseProfileDir } from "../config.js";
import { findMoodleSite } from "../moodle/site.js";
import { serverInfo, serverInfoSchema } from "./serverInfo.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  url: z.string().optional().describe("The Moodle site's URL, or any page of it (a course URL works: the site is read from it)"),
  headless: z.boolean().optional().describe("Run the browser without a window (logging in always shows one)"),
  profileDir: z.string().optional().describe("Absolute folder for the browser profile that keeps the Moodle session; outside the server's folder"),
};

/**
 * Settings given at run time, in memory only: the server stores nothing (ADR-009). Everything is
 * validated before anything changes, so a bad value leaves the previous configuration.
 */
export const registerConfigure: RegisterTool = (server, context) => {
  server.registerTool(
    "configure",
    {
      title: "Configure the server",
      description:
        "Set this server's configuration for this session: the Moodle site (url), whether the browser runs without a window (headless) and the browser profile folder (profileDir). Each is optional; only those given change. The URL is checked to be a Moodle site. Kept in memory only. Returns the effective configuration, as server_info.",
      inputSchema,
      outputSchema: serverInfoSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ url, headless, profileDir }) => {
      const { config, browser } = context;
      const moodleUrl = url !== undefined ? await findMoodleSite(url) : undefined;
      const dir = profileDir !== undefined ? parseProfileDir(profileDir) : undefined;

      // The browser's profile and mode are fixed at launch: close it, and the next tool reopens it.
      const relaunch = (dir !== undefined && dir !== config.profileDir) || (headless !== undefined && headless !== config.headless);
      if (relaunch) await browser.close();

      if (moodleUrl !== undefined) {
        config.moodleUrl = moodleUrl;
        config.sources.moodleUrl = "configure";
      }
      if (dir !== undefined) {
        config.profileDir = dir;
        config.sources.profileDir = "configure";
      }
      if (headless !== undefined) {
        config.headless = headless;
        config.sources.headless = "configure";
      }

      const info = serverInfo(context);
      return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }], structuredContent: info };
    },
  );
};
