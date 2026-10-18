// A course's gradebook beyond single grades: a CSV of grades imported, its scales and grade letters.
import { z } from "zod";
import { addScale, courseScales, editScale, gradeLetters, importGrades, setGradeLetters } from "@falkenslab/moodle-driver";
import { pseudonymizing } from "../people.js";
import { onSite, reply } from "./reply.js";
import { OutOfScopeError, othersFilesAllowed } from "./scopes.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();
const scale = z.object({ id: z.number().int(), name: z.string(), items: z.array(z.string()).describe("From the lowest to the highest"), used: z.boolean().describe("Something grades with it: its values can't change"), site: z.boolean().describe("One of the site's standard scales") });
const letters = { overridden: z.boolean().describe("The course's own letters; the site's defaults otherwise"), letters: z.array(z.object({ letter: z.string(), minGrade: z.number().describe("Its lower boundary, in percent") })).describe("From the highest boundary to the lowest") };
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

export const registerImportGrades: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "import_grades",
    {
      title: "Import grades from a CSV file",
      description:
        "Import grades into a course's gradebook from a local CSV file, as Moodle's CSV import does: mapFrom is the column that identifies each person and mapTo what it holds (user id, username, ID number or email); items says which grade item (an id from get_gradebook_setup) each other column goes into, feedback which item's feedback. preview: true only shows how Moodle reads the file, importing nothing: do that first. Moodle imports all or nothing. The file identifies people: only with names in clear (the server's student data level). Changes grades students see: confirm with the person first.",
      inputSchema: {
        courseId,
        file: z.string().min(1).describe("An absolute local path to the CSV"),
        mapFrom: z.string().min(1).describe("The column (its header) that identifies each person"),
        mapTo: z.enum(["id", "username", "idnumber", "email"]),
        items: z.record(z.string(), z.number().int().positive()).optional().describe("Column header → grade item id"),
        feedback: z.record(z.string(), z.number().int().positive()).optional().describe("Column header → the grade item whose feedback it is"),
        preview: z.boolean().optional().describe("Only show how Moodle reads the file"),
        separator: z.enum(["comma", "semicolon", "tab", "colon"]).optional(),
        encoding: z.string().optional().describe("One Moodle offers; UTF-8 by default"),
      },
      outputSchema: { changed: z.string(), imported: z.boolean(), preview: z.object({ columns: z.array(z.string()), rows: z.array(z.array(z.string())) }), notices: z.array(z.string()) },
      annotations: { ...writes, idempotentHint: false },
    },
    async ({ courseId: id, file, items, feedback, ...options }) => {
      if (!othersFilesAllowed(config)) throw new OutOfScopeError(pseudonymizing(config) ? "A grades file identifies every participant, and this server pseudonymizes them: import it in Moodle yourself, or set grades one by one with set_grade." : "A grades file holds students' data: this server is configured without it.");
      const columns: Record<string, number | { feedback: number }> = { ...items };
      for (const [header, item] of Object.entries(feedback ?? {})) {
        if (columns[header] !== undefined) throw new Error(`The column "${header}" is both a grade and feedback.`);
        columns[header] = { feedback: item };
      }
      if (Object.keys(columns).length === 0) throw new Error("Say which columns go into which grade items (items, feedback).");
      return reply(await importGrades(...(await onSite(config, browser)), id, file, { ...options, columns }));
    },
  );
};

export const registerListScales: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_scales",
    {
      title: "List a course's scales",
      description: "List the scales a course's grades can use: its own and the site's standard ones, with their values and whether something grades with them.",
      inputSchema: { courseId },
      outputSchema: { scales: z.array(scale) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id }) => reply({ scales: await courseScales(...(await onSite(config, browser)), id) }),
  );
};

export const registerAddScale: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_scale",
    {
      title: "Add a scale to a course",
      description: "Add a scale to a course: its name and values from the lowest to the highest (no commas in them), and a description. Returns it. Changes the course: confirm with the person first.",
      inputSchema: { courseId, name: z.string().min(1), items: z.array(z.string().min(1).regex(/^[^,]*$/)).min(2), description: z.string().optional() },
      outputSchema: { changed: z.string(), scale: scale.optional() },
      annotations: { ...writes, idempotentHint: false },
    },
    async ({ courseId: id, ...fields }) => reply(await addScale(...(await onSite(config, browser)), id, fields)),
  );
};

export const registerEditScale: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_scale",
    {
      title: "Change a course's scale",
      description: "Change a course's scale: its name, values or description. A scale something grades with keeps its values. Returns it. Confirm with the person first.",
      inputSchema: { courseId, scaleId: z.number().int().positive().describe("As list_scales gives it"), name: z.string().min(1).optional(), items: z.array(z.string().min(1).regex(/^[^,]*$/)).min(2).optional(), description: z.string().optional() },
      outputSchema: { changed: z.string(), scale: scale.optional() },
      annotations: writes,
    },
    async ({ courseId: id, scaleId, ...fields }) => reply(await editScale(...(await onSite(config, browser)), id, scaleId, fields)),
  );
};

export const registerGetGradeLetters: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_grade_letters",
    {
      title: "Read a course's grade letters",
      description: "Read a course's grade letters, from the highest boundary to the lowest: its own when overridden, the site's defaults otherwise.",
      inputSchema: { courseId },
      outputSchema: letters,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id }) => reply(await gradeLetters(...(await onSite(config, browser)), id)),
  );
};

export const registerSetGradeLetters: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_grade_letters",
    {
      title: "Set a course's grade letters",
      description: "Set a course's own grade letters, each from its minGrade percent, overriding the site's; useDefaults goes back to the site's. Changes how grades show to students: confirm with the person first.",
      inputSchema: {
        courseId,
        letters: z.array(z.object({ letter: z.string().min(1), minGrade: z.number().min(0).max(100) })).min(1).optional(),
        useDefaults: z.boolean().optional().describe("The site's default letters instead"),
      },
      outputSchema: { changed: z.string(), ...letters },
      annotations: writes,
    },
    async ({ courseId: id, letters: given, useDefaults }) => {
      if ((given === undefined) === !useDefaults) throw new Error("Give the letters, or useDefaults: true for the site's.");
      return reply(await setGradeLetters(...(await onSite(config, browser)), id, useDefaults ? null : given!));
    },
  );
};
