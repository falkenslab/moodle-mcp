// A course page's blocks (advanced, ADR-022): listed, added, configured, moved and deleted.
import { z } from "zod";
import { addBlock, configureBlock, courseBlocks, deleteBlock, moveBlock } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();
const blockId = z.number().int().positive().describe("The block's id, as list_course_blocks gives it");
const block = z.object({
  id: z.number().int(),
  type: z.string().describe("Its plugin's name without block_: html (a text block), calendar_upcoming…"),
  title: z.string(),
  region: z.string().describe("side-pre (Boost's only one); Classic's pages have side-post too"),
  weight: z.number().int().optional().describe("Its order in the region (lower first), for whom can edit the blocks"),
  visible: z.boolean().describe("False for a block hidden from students"),
  content: z.string().optional().describe("A text block's HTML"),
});
const embed = z.array(z.string()).optional().describe('Absolute local files the content names, which go in it: <img src="shot.png">');
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

export const registerListCourseBlocks: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_course_blocks",
    {
      title: "List a course page's blocks",
      description: "List the blocks on a course's page: type, title, region, order and visibility, and a text block's content.",
      inputSchema: { courseId },
      outputSchema: { blocks: z.array(block) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id }) => reply({ blocks: await courseBlocks(...(await onSite(config, browser)), id) }),
  );
};

export const registerAddBlock: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_block",
    {
      title: "Add a block to a course page",
      description: "Add a block to a course's page: a text block (type html) with its title and HTML content (local images embedded), or another core block by its type (calendar_upcoming, recent_activity…), in a region or the page's default. Returns the block. Everyone in the course sees it: confirm with the person first.",
      inputSchema: { courseId, type: z.string().regex(/^[a-z0-9_]+$/).describe("html for a text block, or another block's plugin name"), region: z.string().optional(), title: z.string().optional(), content: z.string().optional().describe("A text block's HTML"), embed },
      outputSchema: { changed: z.string(), block },
      annotations: { ...writes, idempotentHint: false },
    },
    async ({ courseId: id, ...input }) => reply(await addBlock(...(await onSite(config, browser)), id, input)),
  );
};

export const registerConfigureBlock: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "configure_block",
    {
      title: "Configure a course page's block",
      description: "Change a block: a text block's title and content, or any field of its configure form by name in settings (bui_visible, config_…). Returns the block. Confirm with the person first.",
      inputSchema: {
        courseId,
        blockId,
        title: z.string().optional(),
        content: z.string().optional(),
        embed,
        settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional().describe("Other fields of the block's configure form, by name"),
      },
      outputSchema: { changed: z.string(), block },
      annotations: writes,
    },
    async ({ courseId: id, blockId: which, ...changes }) => reply(await configureBlock(...(await onSite(config, browser)), id, which, changes)),
  );
};

export const registerMoveBlock: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "move_block",
    {
      title: "Move a course page's block",
      description: "Move a block to another region or place in it (weight: lower comes first). Returns the block. Confirm with the person first.",
      inputSchema: { courseId, blockId, region: z.string().optional(), weight: z.number().int().optional() },
      outputSchema: { changed: z.string(), block },
      annotations: writes,
    },
    async ({ courseId: id, blockId: which, ...place }) => reply(await moveBlock(...(await onSite(config, browser)), id, which, place)),
  );
};

export const registerDeleteBlock: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_block",
    {
      title: "Delete a course page's block",
      description: "Delete a block from a course's page, with its configuration. Can't be undone: confirm with the person first.",
      inputSchema: { courseId, blockId },
      outputSchema: { changed: z.string() },
      annotations: { ...writes, destructiveHint: true },
    },
    async ({ courseId: id, blockId: which }) => reply(await deleteBlock(...(await onSite(config, browser)), id, which)),
  );
};
