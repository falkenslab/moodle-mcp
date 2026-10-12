// The calendar tools: upcoming events, and course events created or deleted through the calendar's own form and service.
import { z } from "zod";
import { calendarEvent, createEvent, deleteEvent, upcomingEvents, updateEvent } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const event = z.object({
  id: z.number().int().describe("The event's id, which delete_event takes"),
  name: z.string(),
  type: z.string().describe('"course", "group", "user", or an activity\'s ("due", "open"…)'),
  start: z.string().describe("ISO 8601"),
  durationMinutes: z.number().optional(),
  courseId: z.number().int().optional(),
  activity: z.object({ type: z.string(), instance: z.number().int() }).optional().describe("For an activity's event: its module and instance"),
});

export const registerListEvents: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_events",
    {
      title: "List upcoming calendar events",
      description: "List the upcoming events of the person's calendar, as its \"Upcoming events\" view does, in one course or in all: course events, activities' dates and the person's own events.",
      inputSchema: { courseId: z.number().int().positive().optional().describe("Only this course's; every course when missing") },
      outputSchema: { events: z.array(event) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId }) => reply({ events: await upcomingEvents(...(await onSite(config, browser)), { courseId }) }),
  );
};

export const registerCreateEvent: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "create_event",
    {
      title: "Create a course event",
      description:
        "Create an event in a course's calendar, which its participants see: a name, a start (ISO 8601 with its time zone), and optionally a duration and a description (HTML). Returns the event. Visible to the course: confirm with the person first.",
      inputSchema: {
        courseId: z.number().int().positive(),
        name: z.string().min(1),
        start: z.string().describe("ISO 8601, e.g. 2026-11-03T10:00:00+01:00"),
        durationMinutes: z.number().int().positive().optional(),
        description: z.string().optional().describe("HTML"),
      },
      outputSchema: { changed: z.string(), event },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ start, ...input }) => {
      const date = new Date(start);
      if (Number.isNaN(date.getTime())) throw new Error(`"${start}" isn't an ISO 8601 date and time.`);
      return reply(await createEvent(...(await onSite(config, browser)), { ...input, start: date }));
    },
  );
};

export const registerDeleteEvent: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_event",
    {
      title: "Delete a calendar event",
      description: "Delete a calendar event the person can manage (a course event, or their own), by its id from list_events or create_event. Activities' dates are changed in the activity instead. Can't be undone: confirm with the person first.",
      inputSchema: { eventId: z.number().int().positive() },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ eventId }) => reply(await deleteEvent(...(await onSite(config, browser)), eventId)),
  );
};

export const registerGetEvent: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_event",
    {
      title: "Read a calendar event",
      description: "Read one calendar event by its id, as list_events gives them.",
      inputSchema: { eventId: z.number().int().positive() },
      outputSchema: event.shape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ eventId }) => reply(await calendarEvent(...(await onSite(config, browser)), eventId)),
  );
};

export const registerUpdateEvent: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "update_event",
    {
      title: "Change a calendar event",
      description: "Change a calendar event through the calendar's own form: only what's given changes; a new start keeps its length unless a new one is given. Activities' dates are changed in the activity instead. Returns the event afterwards. Visible to the course: confirm with the person first.",
      inputSchema: {
        eventId: z.number().int().positive(),
        name: z.string().min(1).optional(),
        description: z.string().optional().describe("HTML"),
        start: z.string().optional().describe("ISO 8601"),
        durationMinutes: z.number().int().positive().optional(),
        until: z.string().optional().describe("Or the end, ISO 8601"),
        location: z.string().optional(),
        wholeSeries: z.boolean().optional().describe("For a repeated event: change every one"),
      },
      outputSchema: { changed: z.string(), event },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ eventId, start, until, ...rest }) => {
      const date = (value: string | undefined, field: string) => {
        if (value === undefined) return undefined;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) throw new Error(`${field}: "${value}" isn't an ISO 8601 date and time.`);
        return parsed;
      };
      return reply(await updateEvent(...(await onSite(config, browser)), eventId, { ...rest, start: date(start, "start"), until: date(until, "until") }));
    },
  );
};
