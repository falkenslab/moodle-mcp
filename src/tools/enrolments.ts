// Who is in a course and with which roles and groups: enrolling, unenrolling, roles and group members.
// People come and go as the reading tools give them (people.ts): aliases under pseudonymize, never emails.
import { z } from "zod";
import { enrolUsers, potentialUsers, setGroupMembers, setUserRoles, unenrolUser } from "@falkenslab/moodle-driver";
import { requireSiteUrl } from "../config.js";
import { people, peopleByIds, personFields, pseudonymizing, shown, targetFields, targetName, targetsFields, targetsName, targetUserId, targetUserIds } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();

function date(value: string | undefined, field: string): Date | undefined {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field}: "${value}" isn't an ISO 8601 date.`);
  return parsed;
}

export const registerListPotentialUsers: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_potential_users",
    {
      title: "Find users to enrol",
      description:
        "Find users the person may enrol in a course by manual enrolment, as the \"Enrol users\" dialog does: matching search in their name or the identity fields the site shows (up to 100 when empty). People as aliases when the server pseudonymizes, never their emails. Enrol them with enrol_users.",
      inputSchema: { courseId, search: z.string().optional().describe("Part of a name, an email, an ID number…") },
      outputSchema: { users: z.array(z.object(personFields)) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id, search }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = await potentialUsers(context, siteUrl, id, search);
      const who = await people(config, context, siteUrl, found);
      // Their emails stay out, whatever the level (ADR-013's minimization).
      return reply({ users: who.map(shown) });
    },
  );
};

export const registerEnrolUsers: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "enrol_users",
    {
      title: "Enrol users in a course",
      description:
        "Enrol users in a course by manual enrolment, as the \"Enrol users\" dialog does: with a role (the enrolment's default unless roleId), from start (now) until end (the enrolment's default duration). Takes them as list_potential_users gives them. Those already enrolled keep their enrolment, with the new dates. Confirm with the person first.",
      inputSchema: {
        courseId,
        ...targetsFields,
        roleId: z.number().int().positive().optional().describe("The role to give, as list_participants' roles give it"),
        start: z.string().optional().describe("ISO 8601"),
        end: z.string().optional().describe("ISO 8601"),
      },
      outputSchema: { changed: z.string(), count: z.number().int(), roleId: z.number().int().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId: id, users, userIds, roleId, start, end }) => {
      const ids = await targetUserIds(config, requireSiteUrl(config), { users, userIds });
      const result = await enrolUsers(...(await onSite(config, browser)), id, ids, { roleId, start: date(start, "start"), end: date(end, "end") });
      return reply({ ...result, changed: `Enrolled ${targetsName({ users, userIds })} in course ${id}.` });
    },
  );
};

export const registerUnenrolUser: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "unenrol_user",
    {
      title: "Unenrol a user from a course",
      description:
        "Unenrol someone from a course: removes every enrolment of theirs the person may remove, with their roles and group memberships in the course; removed and kept name the enrolment methods. Their work in the course stays in Moodle but they lose access. Confirm with the person first.",
      inputSchema: { courseId, ...targetFields },
      outputSchema: { changed: z.string(), removed: z.array(z.string()).describe("Enrolment methods removed"), kept: z.array(z.string()).describe("Enrolment methods the person may not remove") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId: id, user, userId }) => {
      const target = await targetUserId(config, requireSiteUrl(config), { user, userId });
      const result = await unenrolUser(...(await onSite(config, browser)), id, target);
      return reply({ ...result, changed: `Unenrolled ${targetName({ user, userId })} from course ${id} (${result.removed.join(", ") || "nothing removed"}).` });
    },
  );
};

export const registerSetUserRoles: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_user_roles",
    {
      title: "Set someone's roles in a course",
      description:
        "Set a participant's roles in a course, as the participants page's roles column does: gives the roles in roleIds the person may assign and takes away the other ones they may assign; roles from elsewhere stay. Returns the roles afterwards. Confirm with the person first.",
      inputSchema: { courseId, ...targetFields, roleIds: z.array(z.number().int().positive()).describe("Role ids, as list_participants' roles give them") },
      outputSchema: { changed: z.string(), roleIds: z.array(z.number().int()) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId: id, user, userId, roleIds }) => {
      const target = await targetUserId(config, requireSiteUrl(config), { user, userId });
      const result = await setUserRoles(...(await onSite(config, browser)), id, target, roleIds);
      return reply({ ...result, changed: `Roles of ${targetName({ user, userId })} in course ${id} set to ${result.roleIds.join(", ") || "none"}.` });
    },
  );
};

export const registerSetGroupMembers: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_group_members",
    {
      title: "Add or remove a group's members",
      description:
        "Add and remove members of a group, as its members page does: only the course's participants can be added. Takes them as list_participants gives them: aliases (add, remove) when the server pseudonymizes, else user ids (addIds, removeIds). Returns the members afterwards. Confirm with the person first.",
      inputSchema: {
        courseId: courseId.describe("The group's course"),
        groupId: z.number().int().positive().describe("As list_groups gives it"),
        add: z.array(z.string()).optional().describe("Aliases to add, when the server pseudonymizes"),
        remove: z.array(z.string()).optional().describe("Aliases to remove, when the server pseudonymizes"),
        addIds: z.array(z.number().int().positive()).optional().describe("User ids to add, when the server shows names"),
        removeIds: z.array(z.number().int().positive()).optional().describe("User ids to remove, when the server shows names"),
      },
      outputSchema: { changed: z.string(), members: z.array(z.object(personFields)) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId: id, groupId, add, remove, addIds, removeIds }) => {
      const siteUrl = requireSiteUrl(config);
      const pseudonymous = pseudonymizing(config);
      if (pseudonymous ? addIds || removeIds : add || remove) throw new Error(pseudonymous ? "This server pseudonymizes: give the members as aliases (add, remove)." : "Give the members as user ids (addIds, removeIds).");
      const ids = async (aliases?: string[], plain?: number[]) => (aliases ? targetUserIds(config, siteUrl, { users: aliases }) : plain);
      const [context] = await onSite(config, browser);
      const toAdd = (await ids(add, addIds)) ?? [];
      const toRemove = (await ids(remove, removeIds)) ?? [];
      const result = await setGroupMembers(context, siteUrl, groupId, { add: toAdd, remove: toRemove });
      const shownMembers = await peopleByIds(config, context, siteUrl, id, result.members);
      // The driver's message names people by id: this one by what the agent gave, with what Moodle left as it was.
      const label = (i: number, aliases: string[] | undefined, plain: number[]) => aliases?.[i] ?? `user ${plain[i]}`;
      const notAdded = toAdd.map((m, i) => (result.members.includes(m) ? undefined : label(i, add, toAdd))).filter(Boolean);
      const notRemoved = toRemove.map((m, i) => (result.members.includes(m) ? label(i, remove, toRemove) : undefined)).filter(Boolean);
      const changed = `Group ${groupId} has ${result.members.length} members.${notAdded.length ? ` Not added (not in the course): ${notAdded.join(", ")}.` : ""}${notRemoved.length ? ` Still members: ${notRemoved.join(", ")}.` : ""}`;
      return reply({ changed, members: result.members.map((m) => shownMembers.get(m)!) });
    },
  );
};
