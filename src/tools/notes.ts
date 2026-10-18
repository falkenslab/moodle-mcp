// Notes about participants (advanced, ADR-022): read and written by teachers.
// Participants and authors as aliases under pseudonymize; others' notes redacted; no aliases in what's written.
import { z } from "zod";
import type { BrowserContext } from "playwright-core";
import { addNote, deleteNote, editNote, notes, type ParticipantNote } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { requireSiteUrl } from "../config.js";
import { people, personFields, refuseAliases, shown, targetFields, targetUserId, text } from "../people.js";
import { more, pageInputs, pagedText } from "./paging.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();
const noteId = z.number().int().positive().describe("The note's id, as list_notes gives it");
const noteContext = z.enum(["personal", "course", "site"]).describe("personal: only its author sees it; course: the course's teachers; site: teachers in any course");
const note = z.object({
  id: z.number().int(),
  courseId: z.number().int(),
  participant: z.object(personFields).describe("Who it's about"),
  content: z.string().describe("HTML; someone else's redacted when the server pseudonymizes"),
  context: noteContext,
  author: z.object(personFields),
  created: z.string().optional(),
  modified: z.string().optional(),
  editable: z.boolean(),
});

async function shownNotes(config: Config, context: BrowserContext, siteUrl: string, list: ParticipantNote[]) {
  const named = list.flatMap((n) => [{ userId: n.userId, fullName: n.userName }, { userId: n.authorId, fullName: n.authorName }]);
  const who = await people(config, context, siteUrl, named);
  return Promise.all(
    list.map(async (n, i) => {
      const author = who[2 * i + 1]!;
      return {
        id: n.id,
        courseId: n.courseId,
        participant: shown(who[2 * i]!),
        content: await text(config, siteUrl, n.content),
        context: n.context,
        author: shown(author),
        ...(n.created && { created: n.created }),
        ...(n.modified && { modified: n.modified }),
        editable: n.editable,
      };
    }),
  );
}

async function shownChange(config: Config, context: BrowserContext, siteUrl: string, result: { changed: string; noteId: number; note?: ParticipantNote }) {
  return { changed: result.changed, noteId: result.noteId, ...(result.note && { note: (await shownNotes(config, context, siteUrl, [result.note]))[0] }) };
}
const changeSchema = { changed: z.string(), noteId: z.number().int(), note: note.optional() };

export const registerListNotes: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_notes",
    {
      title: "Read notes about a course's participants",
      description: `Read the notes about a course's participants, or one participant's: who it's about and who wrote it (aliases when the server pseudonymizes), its content, whether it's personal, course or site, and whether the person may change it. ${pagedText("notes", 50)}`,
      inputSchema: { courseId, ...targetFields, ...pageInputs("notes", 50, 200) },
      outputSchema: { notes: z.array(note), more },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id, user, userId, limit = 50, offset }) => {
      const one = user !== undefined || userId !== undefined ? await targetUserId(config, requireSiteUrl(config), { user, userId }) : undefined;
      const [context, siteUrl] = await onSite(config, browser);
      const page = await notes(context, siteUrl, id, { userId: one, limit, offset });
      return reply({ notes: await shownNotes(config, context, siteUrl, page.items), more: page.more });
    },
  );
};

export const registerAddNote: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_note",
    {
      title: "Write a note about a participant",
      description: "Write a note about a participant (an alias when the server pseudonymizes): its content (HTML, no aliases in it) and who sees it. Returns the note. Confirm with the person first.",
      inputSchema: { courseId, ...targetFields, content: z.string().min(1), context: noteContext.optional() },
      outputSchema: changeSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId: id, user, userId, ...fields }) => {
      refuseAliases(config, fields.content);
      const target = await targetUserId(config, requireSiteUrl(config), { user, userId });
      const [context, siteUrl] = await onSite(config, browser);
      return reply(await shownChange(config, context, siteUrl, await addNote(context, siteUrl, id, target, fields)));
    },
  );
};

export const registerEditNote: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_note",
    {
      title: "Change a note about a participant",
      description: "Change a note's content (no aliases in it) or who sees it. Returns the note. Confirm with the person first.",
      inputSchema: { noteId, content: z.string().min(1).optional(), context: noteContext.optional() },
      outputSchema: changeSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ noteId: id, ...fields }) => {
      refuseAliases(config, fields.content);
      const [context, siteUrl] = await onSite(config, browser);
      return reply(await shownChange(config, context, siteUrl, await editNote(context, siteUrl, id, fields)));
    },
  );
};

export const registerDeleteNote: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_note",
    {
      title: "Delete a note about a participant",
      description: "Delete a note. Can't be undone: confirm with the person first.",
      inputSchema: { noteId },
      outputSchema: { changed: z.string(), noteId: z.number().int() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ noteId: id }) => {
      const { changed, noteId: deleted } = await deleteNote(...(await onSite(config, browser)), id);
      return reply({ changed, noteId: deleted });
    },
  );
};
