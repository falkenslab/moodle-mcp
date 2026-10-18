// Groups made at once: Moodle's auto-create (previewed first) and its CSV import.
// Members as aliases under pseudonymize.
import { z } from "zod";
import { autoCreateGroups, importGroups } from "@falkenslab/moodle-driver";
import { peopleByIds, personByName, personFields } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();

export const registerAutoCreateGroups: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "auto_create_groups",
    {
      title: "Create groups automatically",
      description:
        "Split a course's participants into groups at once, as Moodle's \"Auto-create groups\" does: count groups, or groups of count members, named by naming (# a number, @ a letter), filled at random or by name or ID number (or left empty), from a role (students by default), a cohort, a grouping or a group, optionally into an existing or new grouping. preview: true shows the groups and members Moodle would make and creates nothing: do that first, then give its seed back to create those same groups. Members as aliases when the server pseudonymizes. Confirm with the person first.",
      inputSchema: {
        courseId,
        by: z.enum(["groups", "members"]).describe("groups: count groups; members: groups of count members"),
        count: z.number().int().positive(),
        naming: z.string().min(1).describe('The groups\' names: # becomes their number, @ a letter ("Group @")'),
        allocation: z.enum(["random", "firstname", "lastname", "idnumber", "none"]).optional().describe("random by default; none leaves them empty"),
        roleId: z.number().int().min(0).optional().describe("Only this role (0: every role); students by default"),
        cohortId: z.number().int().positive().optional(),
        fromGroupingId: z.number().int().positive().optional(),
        fromGroupId: z.number().int().positive().optional(),
        notInGroup: z.boolean().optional().describe("Only participants in no group yet"),
        noSmallGroups: z.boolean().optional().describe("With members: spread a last group that would be too small over the others"),
        groupingId: z.number().int().positive().optional().describe("Put them in this grouping"),
        newGrouping: z.string().min(1).optional().describe("Or in a new grouping of this name"),
        preview: z.boolean().optional(),
        seed: z.number().int().optional().describe("A preview's seed, to create those same groups"),
      },
      outputSchema: {
        changed: z.string(),
        groups: z.array(
          z.object({
            id: z.number().int().optional().describe("Once created"),
            name: z.string(),
            members: z.array(z.object(personFields)),
            nameTaken: z.boolean().optional().describe("A preview's group whose name the course has already: Moodle would create none"),
          }),
        ),
        groupingId: z.number().int().optional(),
        seed: z.number().int(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId: id, ...options }) => {
      const [context, siteUrl] = await onSite(config, browser);
      if (!options.preview) {
        const created = await autoCreateGroups(context, siteUrl, id, { ...options, preview: false });
        const ids = [...new Set(created.groups.flatMap((g) => g.members))];
        const as = await peopleByIds(config, context, siteUrl, id, ids);
        return reply({
          changed: created.changed,
          groups: created.groups.map((g) => ({ id: g.id, name: g.name, members: g.members.map((m) => as.get(m)!) })),
          ...(created.groupingId !== undefined && { groupingId: created.groupingId }),
          seed: created.seed,
        });
      }
      const preview = await autoCreateGroups(context, siteUrl, id, { ...options, preview: true });
      // The preview names members without their ids: an alias where the directory knows the name.
      const groups = await Promise.all(
        preview.groups.map(async (g) => ({
          name: g.name,
          members: await Promise.all(g.members.map(async (name) => {
            const shownName = await personByName(config, context, siteUrl, name);
            return shownName === name ? { fullName: name } : { user: shownName };
          })),
          nameTaken: g.nameTaken,
        })),
      );
      return reply({ changed: preview.changed, groups, seed: preview.seed });
    },
  );
};

export const registerImportGroups: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "import_groups",
    {
      title: "Import groups from a CSV file",
      description:
        "Create groups from a local CSV file, as Moodle's \"Import groups\" does: a groupname column, and optionally description, enrolmentkey, groupidnumber, groupingname (made when missing) and enablemessaging. Moodle creates the groups without members. Returns the new groups and Moodle's messages for the rows it skipped. Changes the course: confirm with the person first.",
      inputSchema: { courseId, file: z.string().min(1).describe("An absolute local path to the CSV"), delimiter: z.enum(["comma", "semicolon", "colon", "tab"]).optional() },
      outputSchema: { changed: z.string(), groups: z.array(z.object({ id: z.number().int(), name: z.string() })), problems: z.array(z.string()) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId: id, file, delimiter }) => reply(await importGroups(...(await onSite(config, browser)), id, file, { delimiter })),
  );
};
