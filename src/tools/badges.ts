// A course's badges: read by anyone in it, made and awarded by its teachers.
import { z } from "zod";
import { awardBadge, courseBadges, createBadge, setBadgeCriteria, setBadgeEnabled, type BadgeCriteriaChanges } from "@falkenslab/moodle-driver";
import { requireSiteUrl } from "../config.js";
import { targetFields, targetName, targetUserId } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const badgeId = z.number().int().positive().describe("The badge's id, as list_badges gives it");

const badge = z.object({
  id: z.number().int(),
  courseId: z.number().int(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string().describe("Its image, which download_file saves"),
  enabled: z.boolean().describe("Only an enabled badge is awarded"),
  criteria: z.string().describe("What earns it, as Moodle sums it up in the site's language"),
  recipients: z.number().int().optional().describe("How many people have it, for a teacher"),
  awarded: z.boolean().describe("Whether the person has it"),
});

const criteria = z.object({
  activities: z.object({ activityIds: z.array(z.number().int()), all: z.boolean() }).optional().describe("Completing these activities: all, or any one"),
  courseCompletion: z.object({ minGrade: z.number().optional(), by: z.string().optional().describe("ISO date") }).optional(),
  manual: z.object({ roleIds: z.array(z.number().int()), all: z.boolean() }).optional().describe("Awarded by hand by people with these roles"),
  all: z.boolean().optional().describe("With more than one criterion: all of them, or any one"),
});

const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

export const registerListBadges: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_badges",
    {
      title: "List a course's badges",
      description:
        "List a course's badges: name, description, image, what earns it (Moodle's summary), whether it's enabled and whether the person has it; for a teacher, disabled badges too and how many people have each. Fails with a clear error where the site has badges turned off.",
      inputSchema: { courseId: z.number().int().positive() },
      outputSchema: { badges: z.array(badge) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId }) => reply({ badges: await courseBadges(...(await onSite(config, browser)), courseId) }),
  );
};

export const registerCreateBadge: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "create_badge",
    {
      title: "Create a course badge",
      description:
        "Create a course badge, disabled and without criteria, through Moodle's new badge form: its name, description (plain text) and image (a local PNG, JPEG or GIF, at most 256 KB). Then set_badge_criteria gives it criteria and set_badge_enabled makes it available. Returns the badge. Changes the course: confirm with the person first.",
      inputSchema: {
        courseId: z.number().int().positive(),
        name: z.string().min(1),
        description: z.string().min(1).describe("Plain text: Moodle strips tags"),
        image: z.string().min(1).describe("An absolute local path to its image: PNG, JPEG or GIF, at most 256 KB"),
        imageCaption: z.string().optional().describe("The image's alternative text"),
      },
      outputSchema: { changed: z.string(), badge },
      annotations: { ...writes, idempotentHint: false },
    },
    async ({ courseId, ...input }) => reply(await createBadge(...(await onSite(config, browser)), courseId, input)),
  );
};

export const registerSetBadgeCriteria: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_badge_criteria",
    {
      title: "Set what earns a badge",
      description:
        "Set a badge's criteria: completing activities (with completion tracking; all of them or any one), completing the course (with a minimum course grade and a date), or awarded by hand by people with some roles (any one of them by default); all says whether every criterion must be met or any one. A criterion given replaces that kind's settings, one in remove goes, one not given stays. Moodle lets criteria change only while the badge is disabled and nobody has it. Returns the criteria. Changes the course: confirm with the person first.",
      inputSchema: {
        badgeId,
        activities: z.object({ activityIds: z.array(z.number().int().positive()).min(1).describe("As get_course_structure gives them"), all: z.boolean().optional().describe("All of them (default) or any one") }).optional(),
        courseCompletion: z.object({ minGrade: z.number().optional(), by: z.string().datetime({ offset: true }).optional().describe("By this date (the day counts)") }).optional(),
        manual: z.object({ roleIds: z.array(z.number().int().positive()).min(1).describe("Roles that may award it, by id (3 is Moodle's editing teacher)"), all: z.boolean().optional().describe("All of them must award it; any one by default") }).optional(),
        all: z.boolean().optional().describe("With more than one criterion: all must be met, or any one"),
        remove: z.array(z.enum(["activities", "courseCompletion", "manual"])).optional().describe("Criteria to take away"),
      },
      outputSchema: { changed: z.string(), criteria },
      annotations: writes,
    },
    async ({ badgeId: id, activities, courseCompletion, manual, all, remove }) => {
      const changes: BadgeCriteriaChanges = { activities, manual, all, ...(courseCompletion && { courseCompletion: { ...courseCompletion, by: courseCompletion.by ? new Date(courseCompletion.by) : undefined } }) };
      for (const kind of remove ?? []) {
        if (changes[kind]) throw new Error(`${kind} is both given and removed.`);
        changes[kind] = null;
      }
      return reply(await setBadgeCriteria(...(await onSite(config, browser)), id, changes));
    },
  );
};

export const registerSetBadgeEnabled: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_badge_enabled",
    {
      title: "Enable or disable a badge",
      description:
        "Make a badge available to users or not. Enabling it awards it at once to everyone who already meets its criteria, and they're told: confirm with the person first. It needs criteria first. Returns the badge.",
      inputSchema: { badgeId, enabled: z.boolean() },
      outputSchema: { changed: z.string(), badge },
      annotations: writes,
    },
    async ({ badgeId: id, enabled }) => reply(await setBadgeEnabled(...(await onSite(config, browser)), id, enabled)),
  );
};

export const registerAwardBadge: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "award_badge",
    {
      title: "Award a badge by hand",
      description:
        "Award a badge by hand to a participant (an alias when the server pseudonymizes), as one of the roles its manual criterion names (roleId when the person holds several). The badge must be enabled and have a manual criterion. Moodle issues it at once when the manual award is enough, else once the rest of its criteria are met. The participant is told: confirm with the person first. Returns the badge.",
      inputSchema: { badgeId, ...targetFields, roleId: z.number().int().positive().optional().describe("The role to award it as") },
      outputSchema: { changed: z.string(), badge },
      annotations: writes,
    },
    async ({ badgeId: id, user, userId, roleId }) => {
      const target = await targetUserId(config, requireSiteUrl(config), { user, userId });
      const result = await awardBadge(...(await onSite(config, browser)), id, target, { roleId });
      return reply({ changed: `Badge ${id} awarded to ${targetName({ user, userId })}.`, badge: result.badge });
    },
  );
};
