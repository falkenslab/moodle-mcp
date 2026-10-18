// A backup file (.mbz) read or anonymized on this computer: no Moodle, no session.
// What names a person in it (authors' names) redacted under pseudonymize.
import { z } from "zod";
import { anonymizeBackup, backupContents, type BackupIdentifier } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { pseudonymizing } from "../people.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const file = z.string().min(1).describe("An absolute local path to the .mbz file");
const identifier = z.object({ file: z.string().describe("The backup's file it's in"), field: z.string().describe("userid, author, original_wwwroot, stamp…"), value: z.string() });

/**
 * Identifiers as tools give them: under pseudonymize, a name never reaches the AI ([name]), nor a
 * user id ([user]); no Moodle is opened here, so there's no directory of aliases to look them up in.
 */
function shownIdentifiers(config: Config, list: BackupIdentifier[]) {
  if (!pseudonymizing(config)) return list;
  return list.map((i) => ({ ...i, value: /author|creator|issuer|firstname|lastname/i.test(i.field) ? "[name]" : /user/i.test(i.field) ? "[user]" : i.value }));
}

export const registerReadBackup: RegisterTool = (server, { config }) => {
  server.registerTool(
    "read_backup",
    {
      title: "Read what a backup file holds",
      description:
        "Read a Moodle backup file (.mbz) on this computer without restoring it, without Moodle: the Moodle that made it, the original site and course, its sections and activities (the original site's ids), the plugins a site needs to restore it, whether it holds people's data or the gradebook, what each activity refers to that the backup doesn't hold (restrictions on activities left out, links to them, its grade category), which a restore elsewhere leaves broken, and what in it still names a person, the site or the course. Use it before restore_course or before sharing a backup.",
      inputSchema: { file },
      outputSchema: {
        name: z.string(),
        type: z.enum(["course", "section", "activity"]),
        moodle: z.object({ version: z.string(), release: z.string() }),
        original: z.object({ site: z.string().optional(), courseId: z.number().int(), courseFullName: z.string().optional(), courseShortName: z.string().optional(), format: z.string().optional() }),
        sections: z.array(z.object({ id: z.number().int(), number: z.number().int().optional(), name: z.string().optional(), summary: z.string().optional(), visible: z.boolean().optional(), parentActivityId: z.number().int().optional() })),
        activities: z.array(
          z.object({
            id: z.number().int(),
            type: z.string(),
            title: z.string(),
            sectionId: z.number().int(),
            dependencies: z.array(
              z.object({
                kind: z.enum(["restriction", "link", "grade-category"]),
                condition: z.enum(["completion", "grade", "group", "grouping"]).optional(),
                activityId: z.number().int().optional(),
                module: z.string().optional(),
                gradeItemId: z.number().int().optional(),
                groupId: z.number().int().optional(),
                groupingId: z.number().int().optional(),
                categoryId: z.number().int().optional(),
              }),
            ).describe("What it refers to that the backup doesn't hold"),
          }),
        ),
        plugins: z.array(z.string()).describe("What a site needs to restore it: mod_quiz, qtype_multichoice, format_topics…"),
        withUsers: z.boolean(),
        gradebook: z.boolean(),
        identifies: z.array(identifier).describe("What still names a person, the site or the course: empty for an anonymous backup"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ file: path }) => {
      const contents = await backupContents(path);
      return reply({ ...contents, identifies: shownIdentifiers(config, contents.identifies) });
    },
  );
};

export const registerAnonymizeBackup: RegisterTool = (server, { config }) => {
  server.registerTool(
    "anonymize_backup",
    {
      title: "Anonymize a backup file",
      description:
        "Write a copy of a Moodle backup file (.mbz) that names no one and no site, on this computer, without Moodle: every user id 0, authors' names empty, the original site's address, the course's id and names and the backup's log replaced by neutral values; the content (texts, settings, files) as it was. Moodle restores it as a backup from another site. Refused for a backup with people's data (Moodle's own anonymize makes those). Returns what was cleared. For sharing a unit with other teachers.",
      inputSchema: { file, destFile: z.string().min(1).describe("Where to write the copy (an absolute local path; it may be file itself)") },
      outputSchema: { changed: z.string(), file: z.object({ path: z.string(), name: z.string(), size: z.number().int() }), cleared: z.array(identifier) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ file: path, destFile }) => {
      const result = await anonymizeBackup(path, destFile);
      return reply({ ...result, cleared: shownIdentifiers(config, result.cleared) });
    },
  );
};
