// get_scorm and open_scorm: a SCORM package is the teacher's own content in Moodle's player, so the agent
// opens it here, does it with the browser fallback tools inside its frame, and reads back what Moodle recorded.
import { z } from "zod";
import { openScorm, scorm } from "@falkenslab/moodle-driver";
import { requireSiteUrl } from "../config.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const activityId = z.number().int().positive().describe("The SCORM activity's id (course module id), as get_course_structure gives it");
const SCO_STATUSES = ["not-attempted", "incomplete", "completed", "passed", "failed", "browsed", "suspended"] as const;

export const registerGetScorm: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_scorm",
    {
      title: "Read a SCORM activity",
      description:
        "Read a SCORM activity as the person sees it: attempts allowed and made, grading method, the grade reported and each attempt's, and its SCOs (the package's parts) with the person's status and score in the last attempt. Use it before open_scorm, and after doing the package to see what Moodle recorded.",
      inputSchema: { activityId },
      outputSchema: {
        id: z.number().int(),
        name: z.string(),
        description: z.string().optional().describe("HTML"),
        attemptsAllowed: z.number().int().optional().describe("None means unlimited"),
        attemptsMade: z.number().int().optional(),
        gradingMethod: z.string().optional(),
        grade: z.string().optional().describe("The grade reported to the gradebook, as Moodle shows it"),
        attemptGrades: z.array(z.object({ attempt: z.number().int(), grade: z.string() })),
        scos: z.array(z.object({ id: z.number().int().describe("The SCO's id, which open_scorm takes"), title: z.string(), status: z.enum(SCO_STATUSES).optional(), score: z.number().optional() })),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ activityId: id }) => reply(await scorm(...(await onSite(config, browser)), id)),
  );
};

export const registerOpenScorm: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "open_scorm",
    {
      title: "Open a SCORM package to do it",
      description:
        "Open a SCORM activity in Moodle's player, as the person, in the browser tools' tab: the last attempt continues unless newAttempt, at the first SCO unless scoId. Opening it starts an attempt in Moodle. Then do the package with the browser tools: browser_snapshot reads it (refs inside its frame start with f, like f2e9), browser_click, browser_type and browser_select act on them, browser_wait waits for its texts. Afterwards, check the result with get_scorm instead of assuming it. Nothing marks a SCORM done or graded but doing it.",
      inputSchema: {
        activityId,
        scoId: z.number().int().positive().optional().describe("The SCO to open, as get_scorm gives it; the first when missing"),
        newAttempt: z.boolean().optional().describe("Start a new attempt instead of continuing the last one"),
      },
      outputSchema: {
        attempt: z.number().int(),
        scoId: z.number().int(),
        version: z.enum(["SCORM 1.2", "SCORM 2004", "AICC"]).optional(),
        url: z.string().describe("The player's page"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ activityId: id, scoId, newAttempt }) => reply(await openScorm(browser, requireSiteUrl(config), id, { scoId, newAttempt })),
  );
};
