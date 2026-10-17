// A database activity's fields, templates and presets, as its teacher sets them up.
import { z } from "zod";
import {
  DATABASE_FIELD_TYPES,
  DATABASE_TEMPLATES,
  addDatabaseField,
  applyDatabasePreset,
  databaseFields,
  databasePresets,
  databaseTemplates,
  deleteDatabaseField,
  editDatabaseField,
  setDatabaseTemplate,
  type DatabaseField,
  type DatabaseFieldOptions,
} from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const databaseId = z.number().int().positive().describe("The database's id (course module id), as get_course_structure gives it");
const fieldId = z.number().int().positive().describe("The field's id, as get_database_fields gives it");

const options = {
  choices: z.array(z.string()).optional().describe("menu, radiobutton, checkbox, multimenu: the choices, in order"),
  autolink: z.boolean().optional().describe("text: link the text where it appears in the course; url: make the URL a link"),
  linkName: z.string().optional().describe("url: the link's text instead of the URL"),
  newWindow: z.boolean().optional().describe("url: open the link in a new window"),
  columns: z.number().int().optional().describe("textarea: its width, in columns"),
  rows: z.number().int().optional().describe("textarea: its height, in rows"),
  maxBytes: z.number().int().optional().describe("textarea, file, picture: the largest file, in bytes (0: the course's limit)"),
  width: z.number().int().optional().describe("picture: width in the single view, in pixels"),
  height: z.number().int().optional().describe("picture: height in the single view"),
  listWidth: z.number().int().optional().describe("picture: width in the list view"),
  listHeight: z.number().int().optional().describe("picture: height in the list view"),
  services: z.array(z.string()).optional().describe('latlong: the map services coordinates link to, by Moodle\'s names ("Google Maps", "OpenStreetMap"…)'),
  kmlLabel: z.string().optional().describe('latlong: how KML files label entries: "entry", "coordinates", or a field\'s id'),
};
const optionsSchema = z.object(options).describe("The type's settings; each type takes only its own");

const field = z.object({
  id: z.number().int(),
  name: z.string().describe("Templates name it [[name]]"),
  type: z.string().describe(`One of ${DATABASE_FIELD_TYPES.join(", ")}, or another plugin's`),
  description: z.string(),
  required: z.boolean(),
  options: optionsSchema,
});
const fields = z.array(field).describe("The database's fields afterwards");

/** The agent's options in the driver's terms: a field's id for the KML label in digits. */
function toOptions(given: z.infer<typeof optionsSchema> | undefined): DatabaseFieldOptions | undefined {
  if (!given) return undefined;
  const { kmlLabel, ...rest } = given;
  if (kmlLabel === undefined) return rest;
  if (/^\d+$/.test(kmlLabel)) return { ...rest, kmlLabel: Number(kmlLabel) };
  if (kmlLabel === "entry" || kmlLabel === "coordinates") return { ...rest, kmlLabel };
  throw new Error('kmlLabel is "entry", "coordinates" or a field\'s id.');
}

/** A field as the output schema has it: the KML label as text. */
function shownField(f: DatabaseField) {
  const { kmlLabel, ...rest } = f.options;
  return { ...f, options: { ...rest, ...(kmlLabel !== undefined && { kmlLabel: String(kmlLabel) }) } };
}
const shownFields = (list: DatabaseField[]) => list.map(shownField);

const templates = z.object(Object.fromEntries(DATABASE_TEMPLATES.map((t) => [t, z.string()])) as Record<(typeof DATABASE_TEMPLATES)[number], z.ZodString>);
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

export const registerGetDatabaseFields: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_database_fields",
    {
      title: "Read a database's fields",
      description:
        "Read a database activity's fields in order: each one's id, name (templates name it [[name]]), type, description, whether an entry needs it, and its type's settings (choices, sizes…). Takes an editing teacher's role.",
      inputSchema: { databaseId },
      outputSchema: { fields: z.array(field) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ databaseId: id }) => reply({ fields: shownFields(await databaseFields(...(await onSite(config, browser)), id)) }),
  );
};

export const registerAddDatabaseField: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_database_field",
    {
      title: "Add a field to a database",
      description:
        "Add a field to a database activity through Moodle's form for its type: text, textarea, number, date, menu, radiobutton, checkbox, multimenu, url, file, picture or latlong, with a name unique in the database, a description, whether it's required (not for a date), and the type's settings. Templates at Moodle's default show it; a saved template may need it added (set_database_template). Returns its id and the fields. Changes the course: confirm with the person first.",
      inputSchema: {
        databaseId,
        type: z.enum(DATABASE_FIELD_TYPES),
        name: z.string().min(1),
        description: z.string().optional(),
        required: z.boolean().optional(),
        options: optionsSchema.optional(),
      },
      outputSchema: { changed: z.string(), fieldId: z.number().int(), fields },
      annotations: writes,
    },
    async ({ databaseId: id, options: given, ...input }) => {
      const options = toOptions(given);
      const result = await addDatabaseField(...(await onSite(config, browser)), id, { ...input, options });
      return reply({ ...result, fields: shownFields(result.fields) });
    },
  );
};

export const registerEditDatabaseField: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_database_field",
    {
      title: "Change a database's field",
      description:
        "Change a database field's name, description, whether it's required, or its type's settings (one by one): what is left out stays. Renaming it renames its tag in the templates, as Moodle does. Its type can't change: delete it and add another. Returns the fields. Changes the course: confirm with the person first.",
      inputSchema: { databaseId, fieldId, name: z.string().min(1).optional(), description: z.string().optional(), required: z.boolean().optional(), options: optionsSchema.optional() },
      outputSchema: { changed: z.string(), fields },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ databaseId: id, fieldId: fieldToEdit, options: given, ...changes }) => {
      const options = toOptions(given);
      const result = await editDatabaseField(...(await onSite(config, browser)), id, fieldToEdit, { ...changes, options });
      return reply({ ...result, fields: shownFields(result.fields) });
    },
  );
};

export const registerDeleteDatabaseField: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_database_field",
    {
      title: "Delete a database's field",
      description: "Delete a database field: what every entry has in it goes too, and its tags leave the templates. Returns the fields. Can't be undone: confirm with the person first.",
      inputSchema: { databaseId, fieldId },
      outputSchema: { changed: z.string(), fields },
      annotations: { ...writes, destructiveHint: true, idempotentHint: true },
    },
    async ({ databaseId: id, fieldId: fieldToDelete }) => {
      const result = await deleteDatabaseField(...(await onSite(config, browser)), id, fieldToDelete);
      return reply({ ...result, fields: shownFields(result.fields) });
    },
  );
};

export const registerGetDatabaseTemplates: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_database_templates",
    {
      title: "Read a database's templates",
      description: `Read a database activity's templates (${DATABASE_TEMPLATES.join(", ")}): what was saved, or Moodle's default for its fields. Fields appear as [[name]], Moodle's other tags as ##tag##. Refused before the database has a field (Moodle has no templates yet). Takes an editing teacher's role.`,
      inputSchema: { databaseId },
      outputSchema: { templates },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ databaseId: id }) => reply({ templates: await databaseTemplates(...(await onSite(config, browser)), id) }),
  );
};

export const registerSetDatabaseTemplate: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_database_template",
    {
      title: "Set a database's template",
      description:
        "Save one of a database's templates as given, without Moodle's HTML editor in between: list (repeated per entry, between listHeader and listFooter), single, add (the entry form: each field's tag once), search, rss, rssTitle, css or js. Fields go in as [[name]], Moodle's other tags as ##tag## (##edit##, ##delete##, ##more##, ##user##…). reset: true puts back Moodle's default. Returns every template. Changes the course: confirm with the person first.",
      inputSchema: {
        databaseId,
        template: z.enum(DATABASE_TEMPLATES),
        html: z.string().optional().describe("The template (HTML, or CSS or JavaScript)"),
        reset: z.boolean().optional().describe("Moodle's default instead (the list's header and footer stay)"),
      },
      outputSchema: { changed: z.string(), templates },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ databaseId: id, template, html, reset }) => {
      if ((html === undefined) === !reset) throw new Error("Give the template as html, or reset: true for Moodle's default.");
      return reply(await setDatabaseTemplate(...(await onSite(config, browser)), id, template, reset ? null : html!));
    },
  );
};

export const registerListDatabasePresets: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_database_presets",
    {
      title: "List the presets for a database",
      description: "List the presets a database activity can be given: Moodle's own (image gallery, journal, proposals, resources) and those saved on the site that the person can see, each with the id apply_database_preset takes.",
      inputSchema: { databaseId },
      outputSchema: { presets: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), userId: z.number().int().optional().describe("Who saved it; none for Moodle's own") })) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ databaseId: id }) => reply({ presets: await databasePresets(...(await onSite(config, browser)), id) }),
  );
};

export const registerApplyDatabasePreset: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "apply_database_preset",
    {
      title: "Give a database a preset",
      description:
        "Give a database activity a preset, as Moodle's \"Use this preset\" does: its fields are added, a field with the same name and type is kept with what entries have in it, every other field is deleted with its content, and its templates replace the database's. Returns the fields. Can delete entries' content: confirm with the person first.",
      inputSchema: { databaseId, presetId: z.string().min(1).describe("As list_database_presets gives it") },
      outputSchema: { changed: z.string(), fields },
      annotations: { ...writes, destructiveHint: true, idempotentHint: true },
    },
    async ({ databaseId: id, presetId }) => {
      const result = await applyDatabasePreset(...(await onSite(config, browser)), id, presetId);
      return reply({ ...result, fields: shownFields(result.fields) });
    },
  );
};
