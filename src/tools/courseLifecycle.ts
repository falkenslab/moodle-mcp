// A course's life cycle: copying, backing up, restoring, importing activities and resetting. The content
// tools by default: what involves people's data (with users) is checked here, against the limits in force.
import { z } from "zod";
import { backupCourse, copyCourse, importActivities, resetCourse, restoreCourse } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { formSettings } from "./courseSettings.js";
import { onSite, reply } from "./reply.js";
import { OutOfScopeError, othersFilesAllowed, studentDataAllowed } from "./scopes.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();
const courseRef = z.object({ id: z.number().int(), fullName: z.string(), shortName: z.string(), categoryId: z.number().int().optional(), url: z.string() });
const LONG = "It can take minutes: Moodle does it in steps, and waits up to ten.";

function date(value: string | undefined, field: string): Date | undefined {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field}: "${value}" isn't an ISO 8601 date.`);
  return parsed;
}

/** People's data copied or restored inside Moodle: only where the limits let the agent touch students' data. */
function refuseUsersWithoutStudentData(config: Config, withUsers: boolean | undefined): void {
  if (withUsers && !studentDataAllowed(config)) throw new OutOfScopeError("With users, this would move students' data (enrolments, submissions, grades): this server is configured without students' data. Do it without users, or in Moodle yourself.");
}

export const registerCopyCourse: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "copy_course",
    {
      title: "Copy a course",
      description: `Copy a course into a new one, as Moodle's "Copy course" does: its content (and, with withUsers, its people's enrolments and data) under a new full and short name, in a category (the course's unless given), with new dates. Needs the rights to back up, restore and create courses. ${LONG} Creates a course: confirm with the person first.`,
      inputSchema: {
        courseId,
        fullName: z.string().min(1),
        shortName: z.string().min(1),
        categoryId: z.number().int().positive().optional(),
        start: z.string().optional().describe("The new course's start, ISO 8601"),
        end: z.string().optional().describe("The new course's end, ISO 8601"),
        withUsers: z.boolean().optional().describe("Also its participants and their data (default false)"),
        visible: z.boolean().optional(),
      },
      outputSchema: { changed: z.string(), course: courseRef },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId: id, start, end, ...rest }) => {
      refuseUsersWithoutStudentData(config, rest.withUsers);
      return reply(await copyCourse(...(await onSite(config, browser)), id, { ...rest, start: date(start, "start"), end: date(end, "end") }));
    },
  );
};

export const registerBackupCourse: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "backup_course",
    {
      title: "Back up a course",
      description: `Back a course up to a .mbz file in a local folder, through Moodle's backup wizard: its content, and with withUsers its people's data too (anonymize makes their names anonymous). Or only some of it: sections (each with everything in it) and activities, never with people's data, and the file naming no one and no site unless anonymous is false. Moodle keeps a copy in the course's backup area. Restore it with restore_course, on this site or another. ${LONG}`,
      inputSchema: {
        courseId,
        destDir: z.string().describe("An absolute local folder for the file"),
        withUsers: z.boolean().optional().describe("Also its participants' data (default false)"),
        anonymize: z.boolean().optional().describe("With users: Moodle makes their names and contact data anonymous"),
        sections: z.array(z.number().int().positive()).optional().describe("Only these sections, by id (get_course_structure), each with everything in it"),
        activities: z.array(z.number().int().positive()).optional().describe("Only these activities and resources, by course module id"),
        anonymous: z.boolean().optional().describe("The file names no person and no site or course of origin: true by default for sections or activities, false for a whole course"),
      },
      outputSchema: { changed: z.string(), file: z.object({ path: z.string(), name: z.string(), size: z.number(), contentType: z.string().optional() }) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId: id, destDir, withUsers, anonymize, sections, activities, anonymous }) => {
      if (withUsers && (sections?.length || activities?.length)) throw new Error("A backup of sections or activities never holds people's data: leave withUsers out, or back up the whole course.");
      refuseUsersWithoutStudentData(config, withUsers);
      // A file on this machine can't be pseudonymized: people's names in it only with names in clear, or anonymized by Moodle.
      if (withUsers && !anonymize && !othersFilesAllowed(config)) throw new OutOfScopeError("A backup with users holds students' names, and this server pseudonymizes them: back it up with anonymize, or without users.");
      return reply(await backupCourse(...(await onSite(config, browser)), id, destDir, { withUsers, anonymize, sections, activities, anonymous }));
    },
  );
};

export const registerRestoreCourse: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "restore_course",
    {
      title: "Restore a course backup",
      description: `Restore a .mbz backup through Moodle's restore wizard: into a new course in a category (no intoCourseId), or into an existing course, adding to its content (mode merge, the default) or replacing it (replace deletes the course's content first). Merged into a course, sectionId puts every restored activity at the end of that section, and afterSectionId the backup's sections as new ones after that one; the result names the new sections and activities, and warnings what was left broken (restrictions or links to what wasn't restored) for the person to fix. A new course takes the backup's names unless fullName and shortName are given. A backup from a newer Moodle, or with activity types this site doesn't offer, is refused. ${LONG} Changes Moodle, and replace can't be undone: confirm with the person first.`,
      inputSchema: {
        file: z.string().describe("The backup's absolute local path (.mbz)"),
        intoCourseId: z.number().int().positive().optional().describe("An existing course to restore into; a new course when missing"),
        categoryId: z.number().int().positive().optional().describe("For a new course: its category"),
        mode: z.enum(["merge", "replace"]).optional().describe("Into an existing course: add to it (default) or replace its content"),
        fullName: z.string().min(1).optional(),
        shortName: z.string().min(1).optional(),
        withUsers: z.boolean().optional().describe("Restore the participants' data the backup has (default false)"),
        sectionId: z.number().int().positive().optional().describe("Merged into a course: every restored activity at the end of this section"),
        afterSectionId: z.number().int().positive().optional().describe("Merged into a course: the backup's sections as new sections after this one"),
      },
      outputSchema: {
        changed: z.string(),
        course: courseRef,
        sectionIds: z.array(z.number().int()).optional().describe("The sections the restore created, merged into a course"),
        activityIds: z.array(z.number().int()).optional().describe("The activities the restore created, merged into a course"),
        warnings: z
          .array(
            z.object({
              activityId: z.number().int(),
              name: z.string(),
              kind: z.enum(["restriction", "link"]).describe("restriction: an access condition on something not restored; link: a link to an activity outside the course"),
              condition: z.enum(["completion", "grade", "group", "grouping"]).optional(),
              url: z.string().optional(),
              message: z.string(),
            }),
          )
          .optional()
          .describe("What the restore left broken, for the person to fix"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ file, intoCourseId, ...rest }) => {
      refuseUsersWithoutStudentData(config, rest.withUsers);
      if (intoCourseId === undefined && rest.categoryId === undefined) throw new Error("A new course needs categoryId; or give intoCourseId to restore into an existing course.");
      return reply(await restoreCourse(...(await onSite(config, browser)), file, { ...rest, into: intoCourseId ?? "new" }));
    },
  );
};

export const registerImportActivities: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "import_activities",
    {
      title: "Import activities from another course",
      description: `Import activities from another course into a course, as Moodle's "Import" does: all of them, or only activityIds, with their sections, never people's data. Returns the new activities' ids. ${LONG} Changes the course: confirm with the person first.`,
      inputSchema: {
        fromCourseId: courseId,
        toCourseId: courseId,
        activityIds: z.array(z.number().int().positive()).optional().describe("Only these activities of the other course (course module ids)"),
      },
      outputSchema: { changed: z.string(), activityIds: z.array(z.number().int()) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ fromCourseId, toCourseId, activityIds }) => reply(await importActivities(...(await onSite(config, browser)), fromCourseId, toCourseId, { activityIds })),
  );
};

export const registerResetCourse: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "reset_course",
    {
      title: "Reset a course for a new year",
      description:
        "Reset a course as Moodle's reset form does: delete only what's named in delete (submissions, attempts, posts, grades… in every activity that has them), unenrol the people with unenrolRoles, move the start date (and the activities' dates with it), and set any other field of the form by name. Nothing is deleted unless named. Can't be undone: confirm every item with the person first. Returns Moodle's report.",
      inputSchema: {
        courseId,
        delete: z
          .object({
            submissions: z.boolean().optional(),
            attempts: z.boolean().optional().describe("Quiz and lesson attempts"),
            posts: z.boolean().optional().describe("Forum posts"),
            grades: z.boolean().optional(),
            overrides: z.boolean().optional().describe("User and group overrides"),
            choices: z.boolean().optional().describe("Choice answers"),
            events: z.boolean().optional().describe("Calendar events"),
            groups: z.boolean().optional(),
            completion: z.boolean().optional(),
            notes: z.boolean().optional(),
            comments: z.boolean().optional(),
          })
          .optional(),
        unenrolRoles: z.array(z.number().int().positive()).optional().describe("Role ids whose people are unenrolled"),
        start: z.string().optional().describe("The new start date, ISO 8601"),
        fields: formSettings.describe("Any other field of the reset form, by name"),
      },
      outputSchema: { changed: z.string(), report: z.array(z.object({ component: z.string(), item: z.string(), done: z.boolean(), error: z.string().optional() })) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId: id, start, ...rest }) => reply(await resetCourse(...(await onSite(config, browser)), id, { ...rest, start: date(start, "start") })),
  );
};
