// What people answered in a choice, a feedback or a questionnaire, for a teacher.
// Respondents as aliases under pseudonymize, their text answers redacted; anonymous ones name no one.
import { z } from "zod";
import { choiceResults, surveyResults } from "@falkenslab/moodle-driver";
import { people, personByName, personFields, shown, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const activityId = z.number().int().positive().describe("The activity's id (course module id), as get_course_structure gives it");
const person = z.object(personFields);
const count = z.object({ option: z.string(), count: z.number().int() });

export const registerGetChoiceResults: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_choice_results",
    {
      title: "Read a choice's results",
      description:
        "Read a choice's responses as its report shows a teacher: each option with how many chose it and who (aliases when the server pseudonymizes), and who hasn't answered where the choice shows that. The report names people whatever the choice publishes to students.",
      inputSchema: { choiceId: activityId },
      outputSchema: {
        id: z.number().int(),
        options: z.array(z.object({ id: z.number().int().optional(), text: z.string(), count: z.number().int(), users: z.array(person) })),
        notAnswered: z.array(person).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ choiceId }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const results = await choiceResults(context, siteUrl, choiceId);
      const everyone = [...results.options.flatMap((o) => o.users), ...(results.notAnswered ?? [])];
      const who = await people(config, context, siteUrl, everyone);
      const as = new Map(everyone.map((p, i) => [p.userId, shown(who[i]!)]));
      return reply({
        id: results.id,
        options: results.options.map((o) => ({ ...o, users: o.users.map((u) => as.get(u.userId)!) })),
        ...(results.notAnswered && { notAnswered: results.notAnswered.map((u) => as.get(u.userId)!) }),
      });
    },
  );
};

export const registerGetSurveyResults: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_survey_results",
    {
      title: "Read a survey's results",
      description:
        "Read what people answered in a feedback or a questionnaire, as its reports show a teacher: every response (who gave it, an alias when the server pseudonymizes, none when anonymous) and, per question, each response's answer (text redacted when pseudonymizing), the counts of a choice question's options and the average of numeric and rated ones. A questionnaire lists its responses only once someone has answered.",
      inputSchema: { activityId, type: z.enum(["questionnaire", "feedback"]).optional().describe("The activity's type, as get_course_structure gives it; found when missing") },
      outputSchema: {
        id: z.number().int(),
        type: z.enum(["questionnaire", "feedback"]),
        responses: z.array(z.object({ id: z.number().int(), anonymous: z.boolean(), respondent: person.optional(), number: z.number().int().optional().describe("A feedback's anonymous response number") })),
        questions: z.array(
          z.object({
            id: z.number().int(),
            number: z.string().optional(),
            text: z.string(),
            type: z.string().describe("The module's own type: multichoice, numeric, textarea…; radio, check, rate, essay…"),
            answers: z.array(z.object({ responseId: z.number().int(), values: z.array(z.string()) })),
            counts: z.array(count).optional(),
            average: z.number().optional(),
            rows: z.array(z.object({ row: z.string(), counts: z.array(count), average: z.number().optional() })).optional().describe("A questionnaire's rate question, row by row"),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ activityId: id, type }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const results = await surveyResults(context, siteUrl, id, { type });
      // Named responses by user id where Moodle gives it (a feedback), by name where it doesn't (a questionnaire).
      const withIds = results.responses.filter((r) => !r.anonymous && r.userId !== undefined);
      const who = await people(config, context, siteUrl, withIds.map((r) => ({ userId: r.userId!, fullName: r.fullName ?? "" })));
      const byId = new Map(withIds.map((r, i) => [r.userId!, shown(who[i]!)]));
      const responses = await Promise.all(
        results.responses.map(async ({ userId, fullName, ...r }) => {
          if (r.anonymous) return r;
          if (userId !== undefined) return { ...r, respondent: byId.get(userId)! };
          if (!fullName) return r;
          const name = await personByName(config, context, siteUrl, fullName);
          return { ...r, respondent: name === fullName ? { fullName } : { user: name } };
        }),
      );
      const questions = await Promise.all(
        results.questions.map(async (q) => ({ ...q, answers: await Promise.all(q.answers.map(async (a) => ({ ...a, values: await Promise.all(a.values.map((v) => text(config, siteUrl, v))) }))) })),
      );
      return reply({ id: results.id, type: results.type, responses, questions });
    },
  );
};
