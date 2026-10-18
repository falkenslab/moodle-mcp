// BigBlueButton activities (advanced, ADR-022): their state and recordings, and the person's join link.
import { z } from "zod";
import { bigBlueButton, bigBlueButtonJoinUrl, deleteRecording, setRecordingPublished } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const activityId = z.number().int().positive().describe("The BigBlueButton activity's id (course module id), as get_course_structure gives it");
const recordingId = z.number().int().positive().describe("The recording's id, as get_bigbluebutton gives it");
const recording = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().optional(),
  date: z.string().optional(),
  minutes: z.number().optional(),
  published: z.boolean().describe("Whether students see it"),
  protected: z.boolean().optional(),
  imported: z.boolean(),
  playbacks: z.array(z.object({ format: z.string(), url: z.string() })).describe("Only while it's published"),
});

export const registerGetBigBlueButton: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_bigbluebutton",
    {
      title: "Read a BigBlueButton activity",
      description:
        "Read a BigBlueButton activity: whether it's not open yet, open, running or closed, its schedule, who's in it while running (counts), whether the person can join and as moderator, and its recordings (all for who manages them, the published ones for the rest). Fails with a clear error where the site's BigBlueButton server isn't set up.",
      inputSchema: { activityId },
      outputSchema: {
        id: z.number().int(),
        name: z.string(),
        status: z.enum(["not-open-yet", "open", "running", "closed"]),
        opensAt: z.string().optional(),
        closesAt: z.string().optional(),
        startedAt: z.string().optional(),
        moderators: z.number().int().optional(),
        participants: z.number().int().optional(),
        canJoin: z.boolean(),
        moderator: z.boolean(),
        waitForModerator: z.boolean(),
        userLimit: z.number().int().optional(),
        recordings: z.array(recording),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ activityId: id }) => reply(await bigBlueButton(...(await onSite(config, browser)), id)),
  );
};

export const registerGetBigBlueButtonJoinUrl: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_bigbluebutton_join_url",
    {
      title: "Get the link to join a BigBlueButton meeting",
      description: "Give the link that joins the person to a BigBlueButton meeting, for them to open; nothing is joined here. The link is the person's own: give it to them, not to anyone else.",
      inputSchema: { activityId },
      outputSchema: { url: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ activityId: id }) => reply({ url: await bigBlueButtonJoinUrl(...(await onSite(config, browser)), id) }),
  );
};

export const registerSetRecordingPublished: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_recording_published",
    {
      title: "Publish or hide a BigBlueButton recording",
      description: "Publish a BigBlueButton recording to students, or hide it from them. Returns the recording. Confirm with the person first.",
      inputSchema: { activityId, recordingId, published: z.boolean() },
      outputSchema: { changed: z.string(), recording },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ activityId: id, recordingId: which, published }) => reply(await setRecordingPublished(...(await onSite(config, browser)), id, which, published)),
  );
};

export const registerDeleteRecording: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_recording",
    {
      title: "Delete a BigBlueButton recording",
      description: "Delete a BigBlueButton recording. Can't be undone: confirm with the person first.",
      inputSchema: { activityId, recordingId },
      outputSchema: { changed: z.string(), recordingId: z.number().int() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ activityId: id, recordingId: which }) => reply(await deleteRecording(...(await onSite(config, browser)), id, which)),
  );
};
