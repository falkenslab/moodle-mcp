// How people get into a course: its enrolment methods (manual, self, guest, cohort sync…), never their keys.
import { z } from "zod";
import { enrolmentMethods, setEnrolmentMethod } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const method = z.object({
  id: z.number().int().describe("The method's id, which set_enrolment_method takes"),
  type: z.string().describe('"manual", "self", "guest", "cohort"…'),
  name: z.string(),
  enabled: z.boolean(),
  users: z.number().int().describe("How many users it enrolled"),
  roleId: z.number().int().optional().describe("The role it gives"),
  hasKey: z.boolean().optional().describe("Self enrolment and guest access: whether it asks for a key (never the key)"),
  start: z.string().optional().describe("Self enrolment: from when, ISO 8601"),
  end: z.string().optional().describe("Self enrolment: until when, ISO 8601"),
  maxUsers: z.number().int().optional().describe("Self enrolment: its limit"),
});

export const registerListEnrolmentMethods: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_enrolment_methods",
    {
      title: "List a course's enrolment methods",
      description: "List how people can enrol in a course, in the order Moodle tries them: each method's type, name, whether it's on, how many it enrolled, the role it gives and, for self enrolment and guest access, whether it asks for a key (never the key), dates and limit.",
      inputSchema: { courseId: z.number().int().positive() },
      outputSchema: { methods: z.array(method) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId }) => reply({ methods: await enrolmentMethods(...(await onSite(config, browser)), courseId) }),
  );
};

export const registerSetEnrolmentMethod: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_enrolment_method",
    {
      title: "Set an enrolment method",
      description:
        'Change an enrolment method with its form, by its id or the course\'s first of a type (methodType "self": added when the course has none and Moodle offers it): turn it on or off, its key, dates, role, limit and welcome message. Only what\'s given changes. Returns the method afterwards (never the key). Opens or closes the course to people: confirm with the person first.',
      inputSchema: {
        courseId: z.number().int().positive(),
        methodId: z.number().int().positive().optional().describe("As list_enrolment_methods gives it"),
        methodType: z.string().optional().describe('Or the method\'s type, such as "self" or "guest"'),
        enabled: z.boolean().optional(),
        key: z.string().optional().describe("Self enrolment or guest access key; empty to remove it"),
        start: z.string().optional().describe('From when, ISO 8601; "none" to remove it'),
        end: z.string().optional().describe('Until when, ISO 8601; "none" to remove it'),
        roleId: z.number().int().positive().optional(),
        maxUsers: z.number().int().min(0).optional().describe("0 for no limit"),
        welcomeMessage: z.string().optional().describe("Self enrolment: send this welcome message"),
        noWelcome: z.boolean().optional().describe("Self enrolment: send no welcome message"),
      },
      outputSchema: { changed: z.string(), method },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId, methodId, methodType, start, end, welcomeMessage, noWelcome, ...rest }) => {
      if ((methodId === undefined) === (methodType === undefined)) throw new Error("Give methodId or methodType, one of them.");
      const date = (value: string | undefined, field: string) => {
        if (value === undefined) return undefined;
        if (value === "none") return null;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) throw new Error(`${field}: "${value}" isn't an ISO 8601 date, or "none".`);
        return parsed;
      };
      const welcome = noWelcome ? false : welcomeMessage;
      return reply(
        await setEnrolmentMethod(...(await onSite(config, browser)), courseId, methodId ?? { type: methodType! }, { ...rest, start: date(start, "start"), end: date(end, "end"), ...(welcome !== undefined && { welcome }) }),
      );
    },
  );
};
