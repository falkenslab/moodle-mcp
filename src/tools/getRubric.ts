import { z } from "zod";
import { rubric } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerGetRubric: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_rubric",
    {
      title: "Get an assignment's grading criteria",
      description:
        "Read how an assignment is graded: simple (a grade or a scale), a rubric (criteria with their levels and scores) or a marking guide (criteria with their maximum score). The criterion and level ids are what grade_submission's fields take. Takes the assignment id from list_assignments; needs at least one participant.",
      inputSchema: { assignmentId: z.number().int().positive().describe("The assignment's id (course module id), as list_assignments gives it") },
      outputSchema: {
        assignment: z.object({ id: z.number().int() }),
        method: z.enum(["simple", "rubric", "guide"]),
        criteria: z.array(
          z.object({
            id: z.number().int(),
            description: z.string().describe("A rubric criterion's description; a guide criterion's short name"),
            details: z.string().optional().describe("A guide criterion's description for students"),
            markers: z.string().optional().describe("A guide criterion's description for markers"),
            levels: z.array(z.object({ id: z.number().int(), definition: z.string(), score: z.number() })).optional(),
            maxScore: z.number().optional(),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ assignmentId }) => reply(await rubric(...(await onSite(config, browser)), assignmentId)),
  );
};
