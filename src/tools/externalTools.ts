// A course's external tools (LTI; advanced, ADR-022): listed, added, shown in the chooser, deleted,
// and an LTI activity's launch link for the person. A tool's secret is never read back.
import { z } from "zod";
import { addExternalTool, deleteExternalTool, externalToolLaunchUrl, externalTools, setExternalToolInChooser } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();
const toolId = z.number().int().positive().describe("The tool's id, as list_external_tools gives it");
const tool = z.object({
  id: z.number().int().describe("What create_activity takes as toolId for an LTI activity"),
  name: z.string(),
  description: z.string(),
  scope: z.enum(["site", "course"]).optional().describe("site: set up by an administrator; course: this course's own"),
  url: z.string().optional().describe("A course tool's URL"),
  shownInActivityChooser: z.boolean(),
});
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

export const registerListExternalTools: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_external_tools",
    {
      title: "List a course's external tools",
      description: "List the external tools (LTI) a course may use: those an administrator set up for the site and the course's own, each with whether teachers find it in the activity chooser. create_activity makes an LTI activity from one by its id (type lti, toolId).",
      inputSchema: { courseId },
      outputSchema: { tools: z.array(tool) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id }) => reply({ tools: await externalTools(...(await onSite(config, browser)), id) }),
  );
};

export const registerAddExternalTool: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_external_tool",
    {
      title: "Add an external tool to a course",
      description:
        "Add an external tool (LTI 1.0/1.1) to a course by its launch URL, with the consumer key and shared secret its provider gave (Moodle stores the secret; nothing gives it back), and any other field of Moodle's course tool form by name. Returns the tool. A tool sends the course's people to another site: confirm with the person first.",
      inputSchema: {
        courseId,
        name: z.string().min(1),
        url: z.string().url().describe("The tool's launch URL, or a cartridge's"),
        description: z.string().optional(),
        key: z.string().optional().describe("The consumer key"),
        secret: z.string().optional().describe("The shared secret"),
        settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional().describe("Other fields of the course tool form, by name (lti_launchcontainer, lti_sendname…)"),
      },
      outputSchema: { changed: z.string(), tool },
      annotations: { ...writes, idempotentHint: false },
    },
    async ({ courseId: id, ...input }) => reply(await addExternalTool(...(await onSite(config, browser)), id, input)),
  );
};

export const registerSetExternalToolInChooser: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_external_tool_in_chooser",
    {
      title: "Show an external tool in the activity chooser",
      description: "Show a course's external tool in the activity chooser, or keep it out. Returns the tool. Confirm with the person first.",
      inputSchema: { courseId, toolId, shown: z.boolean() },
      outputSchema: { changed: z.string(), tool },
      annotations: writes,
    },
    async ({ courseId: id, toolId: which, shown }) => reply(await setExternalToolInChooser(...(await onSite(config, browser)), id, which, shown)),
  );
};

export const registerDeleteExternalTool: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_external_tool",
    {
      title: "Delete a course's external tool",
      description: "Delete one of the course's own external tools. Can't be undone: confirm with the person first.",
      inputSchema: { courseId, toolId },
      outputSchema: { changed: z.string() },
      annotations: { ...writes, destructiveHint: true },
    },
    async ({ courseId: id, toolId: which }) => reply(await deleteExternalTool(...(await onSite(config, browser)), id, which)),
  );
};

export const registerGetExternalToolLaunchUrl: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_external_tool_launch_url",
    {
      title: "Get the link that launches an LTI activity",
      description: "Give the link that launches an LTI activity for the person, for them to open; nothing is launched here. The link is the person's own: give it to them, not to anyone else.",
      inputSchema: { activityId: z.number().int().positive().describe("The LTI activity's id (course module id), as get_course_structure gives it") },
      outputSchema: { url: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ activityId }) => reply({ url: await externalToolLaunchUrl(...(await onSite(config, browser)), activityId) }),
  );
};
