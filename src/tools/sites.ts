// The sites a server knows, one active (ADR-021): list them, add one, switch, remove one. Session tools:
// they read or change the server's own state, never Moodle's data.
import { z } from "zod";
import { findMoodleSite } from "@falkenslab/moodle-driver";
import { redactUrl, type Config } from "../config.js";
import { addSite, removeSite, useSite } from "../sites.js";
import type { RegisterTool } from "./types.js";

const sitesSchema = {
  sites: z.array(
    z.object({
      name: z.string().describe("What use_site and remove_site take"),
      url: z.string(),
      active: z.boolean().describe("The site every other tool works on"),
      origin: z.enum(["configuration", "run-time"]).describe("configuration: set by the person, removed only there; run-time: added with add_site or configure"),
    }),
  ),
};

function sitesOf(config: Config) {
  return { sites: config.sites.map((site) => ({ name: site.name, url: redactUrl(site.url), active: site.name === config.activeSite, origin: site.origin })) };
}

const reply = (data: ReturnType<typeof sitesOf>) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data });

export const registerListSites: RegisterTool = (server, { config }) => {
  server.registerTool(
    "list_sites",
    {
      title: "List the Moodle sites",
      description: "List the Moodle sites this server knows, by name: their URL, which one is active (every other tool works on it) and whether each comes from the person's configuration or was added at run time. Switch with use_site.",
      inputSchema: {},
      outputSchema: sitesSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => reply(sitesOf(config)),
  );
};

export const registerAddSite: RegisterTool = (server, { config }) => {
  server.registerTool(
    "add_site",
    {
      title: "Add a Moodle site",
      description:
        "Add a Moodle site to this server, kept for later sessions: its URL (any page of it works) and, optionally, a short name (letters, digits, dots, hyphens; its host by default). Two accounts on one site are two sites: add the second with a name of its own. It doesn't become active: switch to it with use_site, and log in there when a tool asks. Only when the person asks for another site.",
      inputSchema: {
        url: z.string().describe("The site's URL, or any page of it"),
        name: z.string().optional().describe("A short name for it; its host by default"),
      },
      outputSchema: sitesSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ url, name }) => {
      addSite(config, await findMoodleSite(url), name);
      return reply(sitesOf(config));
    },
  );
};

export const registerUseSite: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "use_site",
    {
      title: "Switch to another Moodle site",
      description:
        "Make another known site the active one, by name (list_sites): every other tool works on it from now on. The previous site's browser closes and keeps its session; if the new one has none, the next tool asks to log in. Tell the person which site you're now working on. Lasts for this session.",
      inputSchema: { name: z.string().describe("The site's name, as list_sites gives it") },
      outputSchema: sitesSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ name }) => {
      await useSite(config, browser, name);
      return reply(sitesOf(config));
    },
  );
};

export const registerRemoveSite: RegisterTool = (server, { config }) => {
  server.registerTool(
    "remove_site",
    {
      title: "Remove a Moodle site",
      description:
        "Forget a site added at run time, by name, and delete its browser profile with its session. Not the active site (switch first) nor one from the person's configuration (they remove it there). Can't be undone: confirm with the person first.",
      inputSchema: { name: z.string().describe("The site's name, as list_sites gives it") },
      outputSchema: sitesSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    ({ name }) => {
      removeSite(config, name);
      return reply(sitesOf(config));
    },
  );
};
