// Competencies in a course (advanced, ADR-022): the frameworks, the course's and its activities'
// competencies, and participants' ratings. Participants and raters as aliases under pseudonymize.
import { z } from "zod";
import type { BrowserContext } from "playwright-core";
import { addCourseCompetency, competencyFrameworks, competencyRating, courseCompetencies, rateCompetency, removeCourseCompetency, setActivityCompetencies, type CompetencyRating } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { requireSiteUrl } from "../config.js";
import { people, peopleByIds, personFields, refuseAliases, self, shown, targetFields, targetName, targetUserId, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();
const competencyId = z.number().int().positive().describe("The competency's id, as list_competency_frameworks or list_course_competencies gives it");
const courseCompetency = z.object({
  id: z.number().int(),
  shortName: z.string(),
  idNumber: z.string(),
  description: z.string().describe("HTML"),
  framework: z.object({ id: z.number().int(), name: z.string() }),
  activities: z.array(z.object({ id: z.number().int(), name: z.string() })).describe("The course's activities linked to it"),
});
const courseChange = { changed: z.string(), courseId: z.number().int(), competencyId: z.number().int(), competencies: z.array(courseCompetency) };
const ratingValue = z.object({ value: z.number().int(), name: z.string() });
const rating = z.object({
  courseId: z.number().int(),
  participant: z.object(personFields),
  competencyId: z.number().int(),
  rating: ratingValue.optional().describe("None while unrated"),
  proficient: z.boolean().optional().describe("None while unrated"),
  scale: z.array(z.object({ value: z.number().int(), name: z.string(), proficient: z.boolean() })).describe("The ratings rate_competency takes"),
  evidence: z.array(
    z.object({
      id: z.number().int(),
      action: z.enum(["log", "complete", "override"]),
      description: z.string(),
      note: z.string(),
      rating: ratingValue.optional(),
      by: z.object(personFields).optional(),
      created: z.string(),
    }),
  ).describe("The latest first"),
  canRate: z.boolean(),
});

/** A rating as tools give it: the participant and who gave evidence as aliases or names, notes redacted. */
async function shownRating(config: Config, context: BrowserContext, siteUrl: string, r: CompetencyRating) {
  // The participant by id (the rating names no one), who gave evidence by the names it gives.
  const participant = (await peopleByIds(config, context, siteUrl, r.courseId, [r.userId])).get(r.userId)!;
  const by = r.evidence.filter((e) => e.by).map((e) => ({ userId: e.by!.id, fullName: e.by!.name }));
  const who = await people(config, context, siteUrl, by);
  const as = new Map(by.map((b, i) => [b.userId, shown(who[i]!)]));
  return {
    courseId: r.courseId,
    participant,
    competencyId: r.competencyId,
    ...(r.rating && { rating: r.rating }),
    ...(r.proficient !== null && { proficient: r.proficient }),
    scale: r.scale,
    evidence: await Promise.all(
      r.evidence.map(async (e) => ({
        id: e.id,
        action: e.action,
        description: await text(config, siteUrl, e.description),
        note: await text(config, siteUrl, e.note),
        ...(e.rating && { rating: e.rating }),
        ...(e.by && { by: as.get(e.by.id) }),
        created: e.created,
      })),
    ),
    canRate: r.canRate,
  };
}
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

export const registerListCompetencyFrameworks: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_competency_frameworks",
    {
      title: "List the competency frameworks a course can use",
      description: "List the competency frameworks a course can draw its competencies from, each with its competencies (id, short name, ID number, description, parent). Fails with a clear error where the site has competencies turned off.",
      inputSchema: { courseId },
      outputSchema: {
        frameworks: z.array(
          z.object({
            id: z.number().int(),
            shortName: z.string(),
            idNumber: z.string(),
            description: z.string(),
            competencies: z.array(z.object({ id: z.number().int(), shortName: z.string(), idNumber: z.string(), description: z.string(), parentId: z.number().int().describe("0 at the top") })),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id }) => reply({ frameworks: await competencyFrameworks(...(await onSite(config, browser)), id) }),
  );
};

export const registerListCourseCompetencies: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_course_competencies",
    {
      title: "List a course's competencies",
      description: "List a course's competencies, each with its framework and the course's activities linked to it.",
      inputSchema: { courseId },
      outputSchema: { competencies: z.array(courseCompetency) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id }) => reply({ competencies: await courseCompetencies(...(await onSite(config, browser)), id) }),
  );
};

export const registerAddCourseCompetency: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_course_competency",
    {
      title: "Add a competency to a course",
      description: "Add a framework's competency to a course. Returns the course's competencies. Changes the course: confirm with the person first.",
      inputSchema: { courseId, competencyId },
      outputSchema: courseChange,
      annotations: writes,
    },
    async ({ courseId: id, competencyId: which }) => reply(await addCourseCompetency(...(await onSite(config, browser)), id, which)),
  );
};

export const registerRemoveCourseCompetency: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "remove_course_competency",
    {
      title: "Remove a competency from a course",
      description: "Remove a competency from a course, and its links to the course's activities. Returns the course's competencies. Confirm with the person first.",
      inputSchema: { courseId, competencyId },
      outputSchema: courseChange,
      annotations: { ...writes, destructiveHint: true },
    },
    async ({ courseId: id, competencyId: which }) => reply(await removeCourseCompetency(...(await onSite(config, browser)), id, which)),
  );
};

export const registerSetActivityCompetencies: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_activity_competencies",
    {
      title: "Link competencies to an activity",
      description: "Set the course competencies linked to an activity: the list given replaces its links ([] removes them). Returns the activity's competencies. Confirm with the person first.",
      inputSchema: { activityId: z.number().int().positive().describe("As get_course_structure gives it"), competencyIds: z.array(z.number().int().positive()).describe("The course's competencies, as list_course_competencies gives them") },
      outputSchema: { changed: z.string(), activityId: z.number().int(), competencyIds: z.array(z.number().int()) },
      annotations: writes,
    },
    async ({ activityId, competencyIds }) => reply(await setActivityCompetencies(...(await onSite(config, browser)), activityId, competencyIds)),
  );
};

export const registerGetCompetencyRating: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_competency_rating",
    {
      title: "Read a participant's rating in a competency",
      description: "Read a participant's rating in a course competency (an alias when the server pseudonymizes; the person's own without one): the rating, whether proficient, the scale, the evidence in the course (latest first) and whether the person may rate them.",
      inputSchema: { courseId, competencyId, ...targetFields },
      outputSchema: rating.shape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id, competencyId: which, user, userId }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const target = user !== undefined || userId !== undefined ? await targetUserId(config, requireSiteUrl(config), { user, userId }) : (await self(context, siteUrl)).userId;
      return reply(await shownRating(config, context, siteUrl, await competencyRating(context, siteUrl, id, target, which)));
    },
  );
};

export const registerRateCompetency: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "rate_competency",
    {
      title: "Rate a participant in a competency",
      description: "Rate a participant (an alias when the server pseudonymizes) in a course competency: a value of its scale (1 for the first) or the item's name, with a note kept as evidence (no aliases in it). Returns the rating. The participant sees it: confirm with the person first.",
      inputSchema: { courseId, competencyId, ...targetFields, rating: z.string().min(1).describe("The scale item's value (\"2\") or name"), note: z.string().optional() },
      outputSchema: { changed: z.string(), rating },
      annotations: writes,
    },
    async ({ courseId: id, competencyId: which, user, userId, rating: given, note }) => {
      refuseAliases(config, note);
      const target = await targetUserId(config, requireSiteUrl(config), { user, userId });
      const [context, siteUrl] = await onSite(config, browser);
      const result = await rateCompetency(context, siteUrl, id, target, which, { rating: /^\d+$/.test(given) ? Number(given) : given, note });
      return reply({ changed: `Competency ${which} of ${targetName({ user, userId })} rated.`, rating: await shownRating(config, context, siteUrl, result.rating) });
    },
  );
};
