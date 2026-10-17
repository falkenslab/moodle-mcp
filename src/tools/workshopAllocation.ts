// Who assesses whom in a workshop: read, allocated by hand, at random, or scheduled.
// Authors and reviewers as aliases under pseudonymize; Moodle's report lines redacted.
import { z } from "zod";
import type { BrowserContext } from "playwright-core";
import { allocateRandomly, allocateReviewer, removeReviewer, scheduleAllocation, workshopAllocation, type WorkshopAllocatedSubmission, type WorkshopAllocation } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { requireSiteUrl } from "../config.js";
import { people, personFields, shown, targetUserId, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const workshopId = z.number().int().positive().describe("The workshop's id (course module id)");
const person = z.object(personFields);

const allocatedSubmission = z.object({
  id: z.number().int(),
  title: z.string(),
  author: person,
  reviewers: z.array(z.object({ assessmentId: z.number().int().describe("The assessment Moodle made for them, empty until they assess"), reviewer: person })),
});
const allocation = {
  submissions: z.array(allocatedSubmission),
  potentialReviewers: z.array(person).describe("Who may be allocated as a reviewer"),
};

/** A submission and a reviewer, as the agent gives them: aliases under pseudonymize, else ids. */
const choiceFields = {
  submissionId: z.number().int().positive().optional().describe("The submission, as get_workshop_allocation gives it; or its author"),
  author: z.string().optional().describe("The submission's author's alias, when the server pseudonymizes"),
  authorId: z.number().int().positive().optional().describe("The submission's author's user id, when the server shows names"),
  reviewer: z.string().optional().describe("The reviewer's alias, when the server pseudonymizes"),
  reviewerId: z.number().int().positive().optional().describe("The reviewer's user id, when the server shows names"),
};

const randomFields = {
  perSubmission: z.number().int().positive().optional().describe("Reviews each submission gets; or perReviewer"),
  perReviewer: z.number().int().positive().optional().describe("Reviews each reviewer does"),
  keepCurrent: z.boolean().optional().describe("Keep the allocations there are (default); false removes them first, never graded ones"),
  withoutSubmission: z.boolean().optional().describe("Reviewers without a submission of their own too; off by default"),
  selfAssessment: z.boolean().optional().describe("Add each author's self-assessment, where the workshop allows it"),
  excludeSameGroup: z.boolean().optional().describe("No reviews by peers of the same group (visible groups mode only)"),
};

type Who = { userId: number; fullName: string };
/** Everyone an allocation names, as tools show people: one alias or name each. */
async function shownPeople(config: Config, context: BrowserContext, siteUrl: string, list: Who[]) {
  const unique = [...new Map(list.map((p) => [p.userId, p])).values()];
  const who = await people(config, context, siteUrl, unique);
  const byId = new Map(unique.map((p, i) => [p.userId, shown(who[i]!)]));
  return (id: number) => byId.get(id)!;
}

function namesIn(submissions: WorkshopAllocatedSubmission[]): Who[] {
  return submissions.flatMap((s) => [{ userId: s.authorId, fullName: s.author }, ...s.reviewers.map((r) => ({ userId: r.reviewerId, fullName: r.reviewer }))]);
}

async function shownSubmission(config: Config, siteUrl: string, s: WorkshopAllocatedSubmission, as: (id: number) => ReturnType<typeof shown>) {
  return { id: s.id, title: await text(config, siteUrl, s.title), author: as(s.authorId), reviewers: s.reviewers.map((r) => ({ assessmentId: r.assessmentId, reviewer: as(r.reviewerId) })) };
}

async function shownAllocation(config: Config, context: BrowserContext, siteUrl: string, a: WorkshopAllocation) {
  const as = await shownPeople(config, context, siteUrl, [...namesIn(a.submissions), ...a.potentialReviewers]);
  return {
    submissions: await Promise.all(a.submissions.map((s) => shownSubmission(config, siteUrl, s, as))),
    potentialReviewers: a.potentialReviewers.map((p) => as(p.userId)),
  };
}

/** The ids behind the agent's submission and reviewer. */
async function choice(config: Config, input: { submissionId?: number; author?: string; authorId?: number; reviewer?: string; reviewerId?: number }) {
  const siteUrl = requireSiteUrl(config);
  if ((input.submissionId === undefined) === (input.author === undefined && input.authorId === undefined)) throw new Error("Give the submission as submissionId, or by its author.");
  const reviewerId = await targetUserId(config, siteUrl, { user: input.reviewer, userId: input.reviewerId });
  if (input.submissionId !== undefined) return { submissionId: input.submissionId, reviewerId };
  return { authorId: await targetUserId(config, siteUrl, { user: input.author, userId: input.authorId }), reviewerId };
}

export const registerGetWorkshopAllocation: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_workshop_allocation",
    {
      title: "Read who assesses whom in a workshop",
      description:
        "Read a workshop's allocation as its manual allocation page shows it (in the course's current group): each submission with its author and the reviewers allocated to it, and the participants who may be allocated as reviewers. People as aliases when the server pseudonymizes. Takes a teacher's role.",
      inputSchema: { workshopId },
      outputSchema: allocation,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ workshopId: id }) => {
      const [context, siteUrl] = await onSite(config, browser);
      return reply(await shownAllocation(config, context, siteUrl, await workshopAllocation(context, siteUrl, id)));
    },
  );
};

export const registerAllocateWorkshopReviewer: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "allocate_workshop_reviewer",
    {
      title: "Allocate a reviewer to a workshop submission",
      description:
        "Allocate a reviewer to a submission, as the manual allocation page's \"Add reviewer\" does, in any phase. The submission by its id or its author, the reviewer one get_workshop_allocation lists as a potential reviewer (aliases when the server pseudonymizes). A reviewer already allocated is left as is. Returns the submission's reviewers afterwards. The reviewer is given work: confirm with the person first.",
      inputSchema: { workshopId, ...choiceFields },
      outputSchema: { changed: z.string(), added: z.boolean(), assessmentId: z.number().int(), submission: allocatedSubmission },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, ...input }) => {
      const ids = await choice(config, input);
      const [context, siteUrl] = await onSite(config, browser);
      const result = await allocateReviewer(context, siteUrl, id, ids);
      const as = await shownPeople(config, context, siteUrl, namesIn([result.submission]));
      return reply({
        changed: result.added ? `Reviewer allocated to submission ${result.submission.id}.` : `That reviewer was already allocated to submission ${result.submission.id}.`,
        added: result.added,
        assessmentId: result.assessmentId,
        submission: await shownSubmission(config, siteUrl, result.submission, as),
      });
    },
  );
};

export const registerRemoveWorkshopReviewer: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "remove_workshop_reviewer",
    {
      title: "Remove a reviewer from a workshop submission",
      description:
        "Remove a reviewer's allocation to a submission: Moodle deletes their assessment of it. An assessment already graded is only deleted with evenIfAssessed, and its grade is lost. Returns the submission's reviewers afterwards. Confirm with the person first.",
      inputSchema: { workshopId, ...choiceFields, evenIfAssessed: z.boolean().optional().describe("Also when they already assessed it (the assessment and its grade are deleted)") },
      outputSchema: { changed: z.string(), assessmentId: z.number().int(), submission: allocatedSubmission },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ workshopId: id, evenIfAssessed, ...input }) => {
      const ids = await choice(config, input);
      const [context, siteUrl] = await onSite(config, browser);
      const result = await removeReviewer(context, siteUrl, id, { ...ids, evenIfAssessed });
      const as = await shownPeople(config, context, siteUrl, namesIn([result.submission]));
      return reply({ changed: `Reviewer removed from submission ${result.submission.id}.`, assessmentId: result.assessmentId, submission: await shownSubmission(config, siteUrl, result.submission, as) });
    },
  );
};

export const registerAllocateWorkshopRandomly: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "allocate_workshop_randomly",
    {
      title: "Allocate a workshop's reviewers at random",
      description:
        "Allocate submissions to reviewers at random, as the workshop's random allocation does: perSubmission reviews for each submission, or perReviewer for each reviewer; keeping the current allocations unless keepCurrent is false (graded ones are never removed), among reviewers with a submission unless withoutSubmission, with self-assessments if asked, without peers of the same group if asked. Returns how many were added and removed, Moodle's report and its problems (not enough reviewers…), and the allocation afterwards. Gives participants work: confirm with the person first.",
      inputSchema: { workshopId, ...randomFields },
      outputSchema: { changed: z.string(), added: z.number().int(), removed: z.number().int(), report: z.array(z.string()), problems: z.array(z.string()), ...allocation },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ workshopId: id, ...settings }) => {
      if ((settings.perSubmission === undefined) === (settings.perReviewer === undefined)) throw new Error("Give perSubmission or perReviewer.");
      const [context, siteUrl] = await onSite(config, browser);
      const result = await allocateRandomly(context, siteUrl, id, settings);
      return reply({
        changed: `Random allocation: ${result.added} added, ${result.removed} removed.`,
        added: result.added,
        removed: result.removed,
        report: await Promise.all(result.report.map((line) => text(config, siteUrl, line))),
        problems: await Promise.all(result.problems.map((line) => text(config, siteUrl, line))),
        ...(await shownAllocation(config, context, siteUrl, result.allocation)),
      });
    },
  );
};

export const registerScheduleWorkshopAllocation: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "schedule_workshop_allocation",
    {
      title: "Schedule a workshop's random allocation",
      description:
        "Turn the workshop's scheduled allocation on or off: when on, Moodle allocates at random by itself at the end of the submission phase (once its submissions deadline passes), with the random allocation's settings given here (those left out keep what the form has). Returns the settings and Moodle's status of it (without a submissions deadline it never runs). Confirm with the person first.",
      inputSchema: { workshopId, enabled: z.boolean(), ...randomFields },
      outputSchema: {
        changed: z.string(),
        enabled: z.boolean(),
        perSubmission: z.number().int().optional(),
        perReviewer: z.number().int().optional(),
        keepCurrent: z.boolean(),
        withoutSubmission: z.boolean(),
        selfAssessment: z.boolean(),
        status: z.string().describe("Moodle's status of it, in the site's language"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, ...settings }) => reply(await scheduleAllocation(...(await onSite(config, browser)), id, settings)),
  );
};
