// A glossary's entries and categories: read and written by teachers and students, approved by teachers.
// Authors as aliases under pseudonymize; others' definitions redacted, their attachments named only.
import { z } from "zod";
import type { BrowserContext } from "playwright-core";
import {
  addGlossaryCategory,
  addGlossaryEntry,
  deleteGlossaryEntry,
  editGlossaryEntry,
  exportGlossaryEntries,
  glossaryCategories,
  glossaryEntries,
  importGlossaryEntries,
  setGlossaryEntryApproved,
  type GlossaryEntry,
} from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { people, personFields, pseudonymizing, refuseAliases, shown, text } from "../people.js";
import { more, pageInputs, pagedText } from "./paging.js";
import { onSite, reply } from "./reply.js";
import { OutOfScopeError, othersFilesAllowed } from "./scopes.js";
import type { RegisterTool } from "./types.js";

const glossaryId = z.number().int().positive().describe("The glossary's id (course module id), as get_course_structure gives it");
const entryId = z.number().int().positive().describe("The entry's id, as list_glossary_entries gives it");

const entry = z.object({
  id: z.number().int(),
  concept: z.string(),
  definition: z.string().describe("HTML; someone else's redacted when the server pseudonymizes"),
  aliases: z.array(z.string()).describe("Other words it's found and linked by"),
  categoryIds: z.array(z.number().int()).optional().describe("Its categories; none where the glossary's display format shows none"),
  author: z.object(personFields),
  approved: z.boolean().describe("Shown to everyone; one waiting is shown only to its author and to who approves"),
  attachments: z.array(z.object({ name: z.string(), url: z.string().optional().describe("Download it with download_file; none for someone else's when the server pseudonymizes"), size: z.number().int(), mimeType: z.string().optional() })),
  created: z.string().optional(),
  modified: z.string().optional(),
});

/** Entries as tools give them: authors as aliases or names, others' text redacted and their files named only. */
async function shownEntries(config: Config, context: BrowserContext, siteUrl: string, entries: GlossaryEntry[]) {
  const authors = await people(config, context, siteUrl, entries.map((e) => ({ userId: e.authorId, fullName: e.authorName })));
  return Promise.all(
    entries.map(async (e, i) => {
      const author = authors[i]!;
      const others = Boolean(author.alias);
      return {
        id: e.id,
        aliases: e.aliases,
        ...(e.categoryIds && { categoryIds: e.categoryIds }),
        approved: e.approved,
        ...(e.created && { created: e.created }),
        ...(e.modified && { modified: e.modified }),
        author: shown(author),
        concept: others ? await text(config, siteUrl, e.concept) : e.concept,
        definition: others ? await text(config, siteUrl, e.definition) : e.definition,
        attachments: others && pseudonymizing(config) ? await Promise.all(e.attachments.map(async (a) => ({ name: await text(config, siteUrl, a.name), size: a.size, ...(a.mimeType && { mimeType: a.mimeType }) }))) : e.attachments,
      };
    }),
  );
}

const entryInputs = {
  concept: z.string().min(1),
  definition: z.string().min(1).describe("HTML; no aliases in it"),
  aliases: z.array(z.string()).optional().describe("Other words it's found and linked by"),
  categoryIds: z.array(z.number().int().positive()).optional().describe("As list_glossary_categories gives them"),
  attachments: z.array(z.string()).optional().describe("Absolute local paths of files to attach"),
  embed: z.array(z.string()).optional().describe('Absolute local files to embed in the definition, which names each by its file name: <img src="shot.png">'),
};
const changeSchema = { changed: z.string(), entryId: z.number().int(), entry: entry.optional().describe("The entry afterwards") };
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

/** A change's result with its entry as tools give it. */
async function shownChange(config: Config, context: BrowserContext, siteUrl: string, result: { changed: string; entryId: number; entry?: GlossaryEntry }) {
  return { changed: result.changed, entryId: result.entryId, ...(result.entry && { entry: (await shownEntries(config, context, siteUrl, [result.entry]))[0] }) };
}

export const registerListGlossaryEntries: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_glossary_entries",
    {
      title: "Read a glossary's entries",
      description: `Read a glossary's entries in its order: concept, definition (HTML), aliases, categories, author (an alias when the server pseudonymizes), whether approved, attachments. What the person sees: approved entries and their own waiting; pending gives those waiting for approval, for a teacher. By letter, or a search of concepts, aliases and definitions. ${pagedText("entries", 30)}`,
      inputSchema: {
        glossaryId,
        letter: z.string().length(1).optional().describe("Only concepts starting with this letter"),
        search: z.string().min(1).optional().describe("Words in concepts, aliases or definitions"),
        pending: z.boolean().optional().describe("The entries waiting for approval instead (a teacher's)"),
        ...pageInputs("entries", 30, 200),
      },
      outputSchema: { entries: z.array(entry), more },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ glossaryId: id, limit = 30, ...options }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const page = await glossaryEntries(context, siteUrl, id, { ...options, limit });
      return reply({ entries: await shownEntries(config, context, siteUrl, page.items), more: page.more });
    },
  );
};

export const registerAddGlossaryEntry: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_glossary_entry",
    {
      title: "Add an entry to a glossary",
      description:
        "Add an entry to a glossary as the person: its concept, definition (HTML, with local images embedded), aliases, categories and attached local files. A student's entry waits for a teacher's approval where the glossary asks for it. Returns the entry. Others in the course read it: confirm with the person first.",
      inputSchema: { glossaryId, ...entryInputs },
      outputSchema: changeSchema,
      annotations: writes,
    },
    async ({ glossaryId: id, ...input }) => {
      refuseAliases(config, input.concept, input.definition, ...(input.aliases ?? []));
      const [context, siteUrl] = await onSite(config, browser);
      return reply(await shownChange(config, context, siteUrl, await addGlossaryEntry(context, siteUrl, id, input)));
    },
  );
};

export const registerEditGlossaryEntry: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_glossary_entry",
    {
      title: "Change a glossary entry",
      description:
        "Change a glossary entry: only what is given (attachments replaces its files, [] removes them). A student changes their own while the site's editing time lasts; a teacher, anyone's. Returns the entry. Confirm with the person first.",
      inputSchema: { glossaryId, entryId, ...Object.fromEntries(Object.entries(entryInputs).map(([k, v]) => [k, v.optional()])) as { [K in keyof typeof entryInputs]: z.ZodOptional<(typeof entryInputs)[K]> } },
      outputSchema: changeSchema,
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ glossaryId: id, entryId: entryToEdit, ...changes }) => {
      refuseAliases(config, changes.concept, changes.definition, ...(changes.aliases ?? []));
      const [context, siteUrl] = await onSite(config, browser);
      return reply(await shownChange(config, context, siteUrl, await editGlossaryEntry(context, siteUrl, id, entryToEdit, changes)));
    },
  );
};

export const registerDeleteGlossaryEntry: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_glossary_entry",
    {
      title: "Delete a glossary entry",
      description: "Delete a glossary entry with its files. A student deletes their own while the site's editing time lasts; a teacher, anyone's. Can't be undone: confirm with the person first.",
      inputSchema: { glossaryId, entryId },
      outputSchema: { changed: z.string(), entryId: z.number().int() },
      annotations: { ...writes, destructiveHint: true, idempotentHint: true },
    },
    async ({ glossaryId: id, entryId: entryToDelete }) => {
      const { changed, entryId: deleted } = await deleteGlossaryEntry(...(await onSite(config, browser)), id, entryToDelete);
      return reply({ changed, entryId: deleted });
    },
  );
};

export const registerSetGlossaryEntryApproved: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_glossary_entry_approved",
    {
      title: "Approve a glossary entry",
      description: "Approve an entry waiting for approval (list_glossary_entries with pending lists them), or take an approval back: the entry then waits again, hidden from all but its author and who approves. Its author sees it: confirm with the person first.",
      inputSchema: { glossaryId, entryId, approved: z.boolean() },
      outputSchema: changeSchema,
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ glossaryId: id, entryId: entryToApprove, approved }) => {
      const [context, siteUrl] = await onSite(config, browser);
      return reply(await shownChange(config, context, siteUrl, await setGlossaryEntryApproved(context, siteUrl, id, entryToApprove, approved)));
    },
  );
};

const category = z.object({ id: z.number().int(), name: z.string() });

export const registerListGlossaryCategories: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_glossary_categories",
    {
      title: "List a glossary's categories",
      description: "List a glossary's categories, by id and name, which add_glossary_entry and edit_glossary_entry take.",
      inputSchema: { glossaryId },
      outputSchema: { categories: z.array(category) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ glossaryId: id }) => reply({ categories: await glossaryCategories(...(await onSite(config, browser)), id) }),
  );
};

export const registerAddGlossaryCategory: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_glossary_category",
    {
      title: "Add a category to a glossary",
      description: "Add a category to a glossary; with autoLink, Moodle links its name wherever it appears in the course. Returns its id and the categories. Changes the course: confirm with the person first.",
      inputSchema: { glossaryId, name: z.string().min(1), autoLink: z.boolean().optional() },
      outputSchema: { changed: z.string(), categoryId: z.number().int(), categories: z.array(category) },
      annotations: writes,
    },
    async ({ glossaryId: id, ...input }) => reply(await addGlossaryCategory(...(await onSite(config, browser)), id, input)),
  );
};

export const registerExportGlossary: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "export_glossary",
    {
      title: "Export a glossary's entries to a file",
      description:
        "Save a glossary's approved entries into a local folder as Moodle's XML (with aliases, categories and files), as its \"Export entries\" does; import_glossary brings them into another glossary. The file holds what participants wrote as is: only with names in clear (the server's student data level).",
      inputSchema: { glossaryId, destDir: z.string().min(1).describe("An absolute local folder") },
      outputSchema: { path: z.string(), name: z.string(), size: z.number().int(), contentType: z.string().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ glossaryId: id, destDir }) => {
      if (!othersFilesAllowed(config)) throw new OutOfScopeError(pseudonymizing(config) ? "A glossary's export holds what participants wrote, and this server pseudonymizes them: export it in Moodle yourself, or read it with list_glossary_entries." : "A glossary's export holds students' data: this server is configured without it.");
      return reply(await exportGlossaryEntries(...(await onSite(config, browser)), id, { destDir }));
    },
  );
};

export const registerImportGlossary: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "import_glossary",
    {
      title: "Import entries into a glossary",
      description:
        "Import the entries of a glossary's XML file (as export_glossary saves it) into this glossary, as the person's own entries, approved; with categories, their categories too. Moodle rejects duplicates where the glossary takes none, and entries without concept or definition. Returns how many came in. Changes the course: confirm with the person first.",
      inputSchema: { glossaryId, file: z.string().min(1).describe("An absolute local path to the XML file"), categories: z.boolean().optional().describe("Bring the entries' categories, adding missing ones") },
      outputSchema: { changed: z.string(), total: z.number().int(), imported: z.number().int(), rejected: z.number().int(), categoriesAdded: z.number().int().optional() },
      annotations: writes,
    },
    async ({ glossaryId: id, file, categories }) => reply(await importGlossaryEntries(...(await onSite(config, browser)), id, file, { categories })),
  );
};
