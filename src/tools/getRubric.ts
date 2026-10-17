// get_rubric and set_rubric: an assignment's advanced grading, read and defined.
import { z } from "zod";
import { rubric, setGradingDefinition } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const assignmentId = z.number().int().positive().describe("The assignment's id (course module id), as list_assignments gives it");

/** A criterion as get_rubric gives it and set_rubric returns it. */
const criterion = z.object({
  id: z.number().int(),
  description: z.string().describe("A rubric criterion's description; a guide criterion's short name"),
  details: z.string().optional().describe("A guide criterion's description for students"),
  markers: z.string().optional().describe("A guide criterion's description for markers"),
  levels: z.array(z.object({ id: z.number().int(), definition: z.string(), score: z.number() })).optional(),
  maxScore: z.number().optional(),
});

export const registerGetRubric: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_rubric",
    {
      title: "Get an assignment's grading criteria",
      description:
        "Read how an assignment is graded: simple (a grade or a scale), a rubric (criteria with their levels and scores) or a marking guide (criteria with their maximum score). The criterion and level ids are what grade_submission's fields take. Takes the assignment id from list_assignments; needs at least one participant.",
      inputSchema: { assignmentId },
      outputSchema: {
        assignment: z.object({ id: z.number().int() }),
        method: z.enum(["simple", "rubric", "guide"]),
        criteria: z.array(criterion),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ assignmentId: id }) => reply(await rubric(...(await onSite(config, browser)), id)),
  );
};

export const registerSetRubric: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_rubric",
    {
      title: "Define an assignment's rubric or marking guide",
      description:
        "Define how an assignment is graded with a rubric (criteria, each with two levels or more: a definition and its score) or a marking guide (criteria, each with a short name, a description for students, one for markers and a maximum score, and the guide's frequently used comments), through Moodle's advanced grading editor, ready to use. Creates one where there is none and replaces the one there is, so its criterion and level ids change. Refused once anything has been graded with it: Moodle would regrade. Returns the definition as get_rubric gives it. Changes how students are graded: confirm with the person first.",
      inputSchema: {
        assignmentId,
        method: z.enum(["rubric", "guide"]),
        name: z.string().min(1).describe("Its name, as the advanced grading page lists it"),
        description: z.string().optional().describe("Its description (HTML)"),
        criteria: z
          .array(
            z.object({
              description: z.string().min(1).describe("A rubric criterion's description; a guide criterion's short name"),
              levels: z.array(z.object({ definition: z.string(), score: z.number() })).optional().describe("A rubric criterion's levels, two or more, in order"),
              details: z.string().optional().describe("A guide criterion's description for students and markers"),
              markers: z.string().optional().describe("A guide criterion's description for markers only"),
              maxScore: z.number().optional().describe("A guide criterion's maximum score"),
            }),
          )
          .min(1)
          .describe("In order"),
        comments: z.array(z.string()).optional().describe("A marking guide's frequently used comments, in order"),
      },
      outputSchema: {
        changed: z.string(),
        assignment: z.object({ id: z.number().int() }),
        method: z.enum(["rubric", "guide"]),
        criteria: z.array(criterion),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ assignmentId: id, method, name, description, criteria, comments }) => {
      const definition =
        method === "rubric"
          ? {
              method,
              name,
              description,
              criteria: criteria.map((c) => {
                if (!c.levels || c.levels.length < 2) throw new Error(`The rubric criterion "${c.description}" needs two levels or more.`);
                return { description: c.description, levels: c.levels };
              }),
            }
          : {
              method,
              name,
              description,
              comments,
              criteria: criteria.map((c) => {
                if (c.maxScore === undefined) throw new Error(`The guide criterion "${c.description}" needs its maxScore.`);
                return { shortName: c.description, description: c.details, markers: c.markers, maxScore: c.maxScore };
              }),
            };
      return reply(await setGradingDefinition(...(await onSite(config, browser)), id, definition));
    },
  );
};
