// Access restrictions and completion, as the activity and section tools take and give them: flat objects
// instead of the driver's unions (some clients reject a union of types), converted both ways here.
import { z } from "zod";
import { COMPLETION_STATES, type Completion, type Restriction, type Restrictions } from "@falkenslab/moodle-driver";

const condition = z.object({
  type: z.enum(["date", "grade", "completion", "group", "other"]).describe('"date": between from and until; "grade": a grade in activityId between min and max (percent); "completion": activityId in state; "group": a member of groupId; "other": a condition only Moodle\'s JSON can say'),
  from: z.string().optional().describe("date: ISO 8601"),
  until: z.string().optional().describe("date: ISO 8601"),
  activityId: z.number().int().positive().optional().describe("grade, completion: the activity (course module id)"),
  min: z.number().optional().describe("grade: the lowest grade, in percent"),
  max: z.number().optional().describe("grade: below this, in percent"),
  state: z.enum(COMPLETION_STATES).optional().describe("completion: the state the activity must be in"),
  groupId: z.number().int().positive().optional().describe("group: the group, as list_groups gives it"),
  json: z.string().optional().describe("other: Moodle's availability JSON for this condition, as read"),
});

export const restrictionsSchema = z
  .object({
    conditions: z.array(condition).describe("None: always available"),
    match: z.enum(["all", "any"]).optional().describe("All the conditions (default) or any"),
    hidden: z.boolean().optional().describe("While not met: hidden from students, instead of shown greyed out with the conditions"),
  })
  .describe("When students can open it");

export const completionSchema = z
  .object({
    tracking: z.enum(["none", "manual", "conditions"]).describe('"none": not tracked; "manual": the student marks it; "conditions": the ones below'),
    view: z.boolean().optional(),
    grade: z.boolean().optional().describe("Receiving a grade"),
    passGrade: z.boolean().optional().describe("A passing grade"),
    submit: z.boolean().optional().describe("Submitting it (assignments, choices)"),
    expected: z.string().optional().describe("The completion date shown to students, ISO 8601"),
  })
  .describe("When it counts as complete");

export type RestrictionsInput = z.infer<typeof restrictionsSchema>;
export type CompletionInput = z.infer<typeof completionSchema>;

function isoDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field}: "${value}" isn't an ISO 8601 date.`);
  return date;
}

/** The driver's restrictions from the flat input, refusing a condition without what its type needs. */
export function toRestrictions(input: RestrictionsInput): Restrictions {
  const conditions = input.conditions.map((c, i): Restriction => {
    const need = <T>(value: T | undefined, field: string): T => {
      if (value === undefined) throw new Error(`Condition ${i + 1} (${c.type}) needs ${field}.`);
      return value;
    };
    switch (c.type) {
      case "date":
        if (c.from === undefined && c.until === undefined) throw new Error(`Condition ${i + 1} (date) needs from, until or both.`);
        return { type: "date", ...(c.from !== undefined && { from: isoDate(c.from, "from") }), ...(c.until !== undefined && { until: isoDate(c.until, "until") }) };
      case "grade":
        return { type: "grade", activityId: need(c.activityId, "activityId"), ...(c.min !== undefined && { min: c.min }), ...(c.max !== undefined && { max: c.max }) };
      case "completion":
        return { type: "completion", activityId: need(c.activityId, "activityId"), state: need(c.state, "state") };
      case "group":
        return { type: "group", groupId: need(c.groupId, "groupId") };
      case "other":
        return { type: "other", json: JSON.parse(need(c.json, "json")) };
    }
  });
  return { conditions, ...(input.match && { match: input.match }), ...(input.hidden !== undefined && { hidden: input.hidden }) };
}

/** The flat form of the driver's restrictions, for a tool's output. */
export function fromRestrictions(restrictions: Restrictions): RestrictionsInput {
  const iso = (value: Date | string | undefined) => (value === undefined ? undefined : value instanceof Date ? value.toISOString() : value);
  return {
    conditions: restrictions.conditions.map((c) => {
      switch (c.type) {
        case "date":
          return { type: "date" as const, ...(c.from !== undefined && { from: iso(c.from) }), ...(c.until !== undefined && { until: iso(c.until) }) };
        case "other":
          return { type: "other" as const, json: JSON.stringify(c.json) };
        default:
          return c;
      }
    }),
    ...(restrictions.match && { match: restrictions.match }),
    ...(restrictions.hidden !== undefined && { hidden: restrictions.hidden }),
  };
}

export function toCompletion(input: CompletionInput): Completion {
  if (input.tracking !== "conditions") return input.tracking;
  const { view, grade, passGrade, submit, expected } = input;
  return { view, grade, passGrade, submit, ...(expected !== undefined && { expected: isoDate(expected, "expected") }) };
}

export function fromCompletion(completion: Completion): CompletionInput {
  if (typeof completion === "string") return { tracking: completion };
  const { expected, ...conditions } = completion;
  return { tracking: "conditions", ...conditions, ...(expected !== undefined && { expected: expected instanceof Date ? expected.toISOString() : expected }) };
}
