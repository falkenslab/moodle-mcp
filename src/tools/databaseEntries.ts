// A database activity's entries: read, added, changed and approved, exported and imported as CSV.
// Authors as aliases under pseudonymize; others' values redacted, their files named only.
import { z } from "zod";
import type { BrowserContext } from "playwright-core";
import { addDatabaseEntry, databaseEntries, deleteDatabaseEntry, editDatabaseEntry, exportDatabaseEntries, importDatabaseEntries, setDatabaseEntryApproved, type DatabaseEntry, type DatabaseEntryValues } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { people, personFields, pseudonymizing, refuseAliases, shown, text } from "../people.js";
import { more, pageInputs, pagedText } from "./paging.js";
import { onSite, reply } from "./reply.js";
import { OutOfScopeError, othersFilesAllowed } from "./scopes.js";
import type { RegisterTool } from "./types.js";

const databaseId = z.number().int().positive().describe("The database's id (course module id), as get_course_structure gives it");
const entryId = z.number().int().positive().describe("The entry's id, as list_database_entries gives it");

const entry = z.object({
  id: z.number().int(),
  author: z.object(personFields).optional(),
  created: z.string().optional(),
  modified: z.string().optional(),
  approved: z.boolean().describe("False while it waits for approval"),
  values: z
    .array(
      z.object({
        fieldId: z.number().int(),
        name: z.string().optional(),
        text: z.string().optional().describe("A text, number, date (YYYY-MM-DD), choice, URL or text area's HTML"),
        choices: z.array(z.string()).optional().describe("Checkboxes' or a multi-select list's choices; [latitude, longitude]; [url, link text]"),
        files: z.array(z.object({ name: z.string(), url: z.string().optional() })).optional().describe("A file or picture field's files"),
      }),
    )
    .optional()
    .describe("Each field's value: only for entries the person can edit"),
});

type Value = DatabaseEntry["values"] extends (infer F)[] | undefined ? F : never;
const isFiles = (value: Value["value"]): value is { name: string; url?: string }[] => Array.isArray(value) && value.some((v) => typeof v === "object");

/** Entries as tools give them: authors as aliases or names, others' values redacted and their files named only. */
async function shownEntries(config: Config, context: BrowserContext, siteUrl: string, entries: DatabaseEntry[]) {
  const authors = await people(config, context, siteUrl, entries.filter((e) => e.author).map((e) => ({ userId: e.author!.userId, fullName: e.author!.name ?? "" })));
  let next = 0;
  return Promise.all(
    entries.map(async ({ author: who, values, ...e }) => {
      const author = who ? authors[next++]! : undefined;
      const others = Boolean(author?.alias);
      const redact = (value: string) => (others ? text(config, siteUrl, value) : value);
      return {
        ...e,
        ...(author && { author: shown(author) }),
        ...(values && {
          values: await Promise.all(
            values.map(async ({ fieldId, name, value }) => {
              const base = { fieldId, ...(name !== undefined && { name }) };
              if (isFiles(value)) return { ...base, files: others && pseudonymizing(config) ? await Promise.all(value.map(async (f) => ({ name: await text(config, siteUrl, f.name) }))) : value };
              if (Array.isArray(value)) return { ...base, choices: await Promise.all((value as string[]).map(redact)) };
              return { ...base, text: await redact(value) };
            }),
          ),
        }),
      };
    }),
  );
}

const valuesInput = z
  .record(z.string(), z.union([z.string(), z.number(), z.array(z.string())]))
  .describe('By field id or name: text or a number; "YYYY-MM-DD" for a date; the choices for checkboxes or a multi-select list; [latitude, longitude]; a local file\'s absolute path for a file or picture field. No aliases in them.');
const removeFiles = z.array(z.string()).optional().describe("File or picture fields (by id or name) whose file to remove");

function toValues(values: Record<string, string | number | string[]> | undefined, remove: string[] | undefined): DatabaseEntryValues {
  const out: DatabaseEntryValues = { ...values };
  for (const field of remove ?? []) out[field] = null;
  return out;
}
const textsOf = (values: Record<string, string | number | string[]> | undefined) => Object.values(values ?? {}).flatMap((v) => (Array.isArray(v) ? v : [String(v)]));
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

export const registerListDatabaseEntries: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_database_entries",
    {
      title: "Read a database's entries",
      description: `Read a database activity's entries in its list's order: author (an alias when the server pseudonymizes), when added and changed, whether approved, and each field's value for the entries the person can edit (all of them for a teacher; their own for a student). search is Moodle's simple search. ${pagedText("entries", 25)}`,
      inputSchema: { databaseId, search: z.string().min(1).optional(), ...pageInputs("entries", 25, 100) },
      outputSchema: { entries: z.array(entry), more },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ databaseId: id, limit = 25, ...options }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const page = await databaseEntries(context, siteUrl, id, { ...options, limit });
      return reply({ entries: await shownEntries(config, context, siteUrl, page.items), more: page.more });
    },
  );
};

export const registerAddDatabaseEntry: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_database_entry",
    {
      title: "Add an entry to a database",
      description:
        "Add an entry to a database activity as the person, through its \"Add entry\" form: a value per field, by id or name (get_database_fields names them), local files for file and picture fields; fields left out stay as the form has them (a date starts at today). Returns the entry's id. Others in the course may read it: confirm with the person first.",
      inputSchema: { databaseId, values: valuesInput },
      outputSchema: { changed: z.string(), entryId: z.number().int() },
      annotations: writes,
    },
    async ({ databaseId: id, values }) => {
      refuseAliases(config, ...textsOf(values));
      return reply(await addDatabaseEntry(...(await onSite(config, browser)), id, toValues(values, undefined)));
    },
  );
};

export const registerEditDatabaseEntry: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_database_entry",
    {
      title: "Change a database entry",
      description:
        "Change a database entry through its edit form: the fields given (files too), the rest as they are; removeFiles takes a file or picture field's file away. A student changes their own while Moodle lets them; a teacher, anyone's. Confirm with the person first.",
      inputSchema: { databaseId, entryId, values: valuesInput.optional(), removeFiles },
      outputSchema: { changed: z.string(), entryId: z.number().int() },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ databaseId: id, entryId: entryToEdit, values, removeFiles: remove }) => {
      refuseAliases(config, ...textsOf(values));
      return reply(await editDatabaseEntry(...(await onSite(config, browser)), id, entryToEdit, toValues(values, remove)));
    },
  );
};

export const registerDeleteDatabaseEntry: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_database_entry",
    {
      title: "Delete a database entry",
      description: "Delete a database entry with its values and files. A student deletes their own while Moodle lets them change it; a teacher, anyone's. Can't be undone: confirm with the person first.",
      inputSchema: { databaseId, entryId },
      outputSchema: { changed: z.string() },
      annotations: { ...writes, destructiveHint: true, idempotentHint: true },
    },
    async ({ databaseId: id, entryId: entryToDelete }) => reply(await deleteDatabaseEntry(...(await onSite(config, browser)), id, entryToDelete)),
  );
};

export const registerSetDatabaseEntryApproved: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_database_entry_approved",
    {
      title: "Approve a database entry",
      description: "Approve a database entry waiting for approval, or take its approval back: one waiting shows only to its author and to who approves. Its author sees it: confirm with the person first.",
      inputSchema: { databaseId, entryId, approved: z.boolean() },
      outputSchema: { changed: z.string(), approved: z.boolean() },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ databaseId: id, entryId: entryToApprove, approved }) => reply(await setDatabaseEntryApproved(...(await onSite(config, browser)), id, entryToApprove, approved)),
  );
};

export const registerExportDatabaseEntries: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "export_database_entries",
    {
      title: "Export a database's entries to CSV",
      description:
        "Save a database activity's entries to a local CSV file, as its \"Export entries\" does: a column per field (images and files aren't in it), with the authors' details, times and approval if asked. Every entry of the person's group. The file holds what participants wrote as is: only with names in clear (the server's student data level).",
      inputSchema: {
        databaseId,
        file: z.string().min(1).describe("An absolute local path for the CSV (replaced if it's there)"),
        userDetails: z.boolean().optional().describe("The authors' full name, username and email"),
        times: z.boolean().optional(),
        approval: z.boolean().optional(),
      },
      outputSchema: { file: z.string(), entries: z.number().int() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ databaseId: id, file, ...options }) => {
      if (!othersFilesAllowed(config)) throw new OutOfScopeError(pseudonymizing(config) ? "A database's export holds what participants wrote, and this server pseudonymizes them: export it in Moodle yourself, or read it with list_database_entries." : "A database's export holds students' data: this server is configured without it.");
      return reply(await exportDatabaseEntries(...(await onSite(config, browser)), id, file, options));
    },
  );
};

export const registerImportDatabaseEntries: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "import_database_entries",
    {
      title: "Import entries into a database from CSV",
      description:
        "Add entries to a database activity from a local CSV file, as its \"Import entries\" does: a header row with the fields' names (as export_database_entries writes it; a Username column makes that user the author), UTF-8. Returns how many Moodle added. Changes the course: confirm with the person first.",
      inputSchema: { databaseId, file: z.string().min(1).describe("An absolute local path to the CSV"), delimiter: z.enum(["comma", "semicolon", "tab", "colon"]).optional() },
      outputSchema: { changed: z.string(), added: z.number().int() },
      annotations: writes,
    },
    async ({ databaseId: id, file, delimiter }) => reply(await importDatabaseEntries(...(await onSite(config, browser)), id, file, { delimiter })),
  );
};
