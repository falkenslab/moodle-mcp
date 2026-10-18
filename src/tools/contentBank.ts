// A course's content bank (advanced, ADR-022): H5P content listed, uploaded, renamed, downloaded, deleted.
// Authors are teachers, named only as Moodle shows them: an alias under pseudonymize where the directory knows them.
import { z } from "zod";
import type { BrowserContext } from "playwright-core";
import { contentBank, deleteContent, downloadContent, renameContent, uploadToContentBank, type BankContent } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { personByName } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();
const contentId = z.number().int().positive().describe("The content's id, as list_content_bank gives it");
const content = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string().describe("h5p"),
  contentType: z.object({ library: z.string(), version: z.string() }).optional().describe("The H5P library"),
  author: z.string().describe("Its author's name, or alias when the server pseudonymizes"),
  modified: z.string().optional(),
  size: z.number().int().describe("In bytes"),
  uses: z.number().int().describe("How many activities use it"),
  unlisted: z.boolean(),
  fileUrl: z.string().optional(),
});

async function shown(config: Config, context: BrowserContext, siteUrl: string, c: BankContent) {
  const { authorName, ...rest } = c;
  return { ...rest, author: await personByName(config, context, siteUrl, authorName) };
}
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

export const registerListContentBank: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_content_bank",
    {
      title: "List a course's content bank",
      description: "List a course's content bank: each content's name, H5P library, author, date, size, how many activities use it and whether it's unlisted.",
      inputSchema: { courseId },
      outputSchema: { contents: z.array(content) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id }) => {
      const [context, siteUrl] = await onSite(config, browser);
      return reply({ contents: await Promise.all((await contentBank(context, siteUrl, id)).map((c) => shown(config, context, siteUrl, c))) });
    },
  );
};

export const registerUploadToContentBank: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "upload_to_content_bank",
    {
      title: "Upload H5P content to a course's content bank",
      description: "Upload a local .h5p file to a course's content bank, where H5P activities can use it. Returns the content. Changes the course: confirm with the person first.",
      inputSchema: { courseId, file: z.string().min(1).describe("An absolute local path to the .h5p file") },
      outputSchema: { changed: z.string(), content },
      annotations: writes,
    },
    async ({ courseId: id, file }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const result = await uploadToContentBank(context, siteUrl, id, file);
      return reply({ changed: result.changed, content: await shown(config, context, siteUrl, result.content) });
    },
  );
};

export const registerRenameContent: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "rename_content",
    {
      title: "Rename content in a content bank",
      description: "Rename a content of a content bank. Confirm with the person first.",
      inputSchema: { contentId, name: z.string().min(1) },
      outputSchema: { changed: z.string(), contentId: z.number().int(), name: z.string() },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ contentId: id, name }) => reply(await renameContent(...(await onSite(config, browser)), id, name)),
  );
};

export const registerDownloadContent: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "download_content",
    {
      title: "Download content from a content bank",
      description: "Save a content bank's content (its .h5p file) into a local folder.",
      inputSchema: { contentId, destDir: z.string().min(1).describe("An absolute local folder") },
      outputSchema: { path: z.string(), name: z.string(), size: z.number().int(), contentType: z.string().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ contentId: id, destDir }) => reply(await downloadContent(...(await onSite(config, browser)), id, destDir)),
  );
};

export const registerDeleteContent: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_content",
    {
      title: "Delete content from a content bank",
      description: "Delete a content of a content bank. Can't be undone: confirm with the person first.",
      inputSchema: { contentId },
      outputSchema: { changed: z.string(), contentId: z.number().int() },
      annotations: { ...writes, destructiveHint: true, idempotentHint: true },
    },
    async ({ contentId: id }) => reply(await deleteContent(...(await onSite(config, browser)), id)),
  );
};
