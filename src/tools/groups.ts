// Groups and groupings as a course's structure: creating, changing and deleting them, and which groups
// a grouping holds. Who is in a group is people's data: list_groups and set_group_members.
import { z } from "zod";
import { createGroup, createGrouping, deleteGroup, deleteGrouping, groupings, setGroupingGroups, updateGroup } from "@falkenslab/moodle-driver";
import { text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();
const groupId = z.number().int().positive().describe("The group's id, as list_groups gives it");
const groupingId = z.number().int().positive().describe("The grouping's id, as list_groupings gives it");
const groupFields = {
  description: z.string().optional().describe("HTML"),
  idNumber: z.string().optional().describe("An id for external systems"),
  enrolmentKey: z.string().optional().describe("A key that enrols students straight into this group with self enrolment"),
};

export const registerCreateGroup: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "create_group",
    {
      title: "Create a group",
      description: "Create a group in a course with Moodle's group form. Add its members with set_group_members. Returns its id. Changes the course: confirm with the person first.",
      inputSchema: { courseId, name: z.string().min(1), ...groupFields },
      outputSchema: { changed: z.string(), groupId: z.number().int() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId: id, ...settings }) => reply(await createGroup(...(await onSite(config, browser)), id, settings)),
  );
};

export const registerUpdateGroup: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "update_group",
    {
      title: "Change a group",
      description: "Change a group's name, description, ID number or enrolment key; what isn't given stays. Confirm with the person first.",
      inputSchema: { groupId, name: z.string().min(1).optional(), ...groupFields },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ groupId: id, ...settings }) => reply(await updateGroup(...(await onSite(config, browser)), id, settings)),
  );
};

export const registerDeleteGroup: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_group",
    {
      title: "Delete a group",
      description: "Delete a group; its members stay in the course. Activities set to work by groups lose it. Can't be undone: confirm with the person first.",
      inputSchema: { groupId },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ groupId: id }) => reply(await deleteGroup(...(await onSite(config, browser)), id)),
  );
};

export const registerListGroupings: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_groupings",
    {
      title: "List a course's groupings",
      description: "List a course's groupings (sets of groups an activity can be limited to) with their groups' ids. Needs the right to manage groups.",
      inputSchema: { courseId },
      outputSchema: { groupings: z.array(z.object({ id: z.number().int(), name: z.string(), groupIds: z.array(z.number().int()) })) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id }) => {
      const [context, siteUrl] = await onSite(config, browser);
      // A grouping's name is the teacher's, but it may name a student.
      const found = await groupings(context, siteUrl, id);
      return reply({ groupings: await Promise.all(found.map(async (g) => ({ ...g, name: await text(config, siteUrl, g.name) }))) });
    },
  );
};

export const registerCreateGrouping: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "create_grouping",
    {
      title: "Create a grouping",
      description: "Create a grouping in a course with Moodle's form; give it its groups with set_grouping_groups. Returns its id. Confirm with the person first.",
      inputSchema: { courseId, name: z.string().min(1), description: z.string().optional().describe("HTML"), idNumber: z.string().optional() },
      outputSchema: { changed: z.string(), groupingId: z.number().int() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId: id, ...settings }) => reply(await createGrouping(...(await onSite(config, browser)), id, settings)),
  );
};

export const registerDeleteGrouping: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_grouping",
    {
      title: "Delete a grouping",
      description: "Delete a grouping; its groups stay. Can't be undone: confirm with the person first.",
      inputSchema: { groupingId },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ groupingId: id }) => reply(await deleteGrouping(...(await onSite(config, browser)), id)),
  );
};

export const registerSetGroupingGroups: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_grouping_groups",
    {
      title: "Set a grouping's groups",
      description: "Make a grouping's groups exactly groupIds, adding and removing as its page does; groups of other courses are left out and named. Returns its groups afterwards. Confirm with the person first.",
      inputSchema: { groupingId, groupIds: z.array(z.number().int().positive()) },
      outputSchema: { changed: z.string(), groupIds: z.array(z.number().int()) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ groupingId: id, groupIds }) => reply(await setGroupingGroups(...(await onSite(config, browser)), id, groupIds)),
  );
};
