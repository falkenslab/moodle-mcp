// Other people as the agent sees them (ADR-013, ADR-016): with `pseudonymize`, a stable alias from
// @falkenslab/pseudonym instead of a name or a Moodle user id, and free text redacted; with `clear`,
// as Moodle shows them. The person's own data stays visible.
import type { BrowserContext, Page } from "playwright-core";
import { redact, remember, resolve } from "@falkenslab/pseudonym";
import { participants, whoAmI } from "@falkenslab/moodle-driver";
import { z } from "zod";
import type { Config } from "./config.js";

// An alias as pseudonym gives it: `A-` and Crockford's base32.
const ALIAS = /^A-[0-9A-HJKMNP-TV-Z]{6,12}$/;

/** Where people are met: one service per Moodle site, its host (and port). */
export function serviceOf(siteUrl: string): string {
  return `moodle@${new URL(siteUrl).host}`;
}

export function pseudonymizing(config: Pick<Config, "studentData">): boolean {
  return config.studentData === "pseudonymize";
}

/** What a list of people from Moodle becomes for the agent: an alias each, or their id and name. */
export interface Person {
  userId?: number;
  fullName?: string;
  alias?: string;
}

// The person's own id and name, per site: theirs stays visible.
const selves = new Map<string, Promise<{ userId: number; fullName: string }>>();

/** Forgets who the person is: another account may log in next (login, logout). */
export function forgetSelf(): void {
  selves.clear();
}

/** The logged-in person, read once per site (the session's own data, not someone else's). */
export function self(context: BrowserContext, siteUrl: string): Promise<{ userId: number; fullName: string }> {
  let known = selves.get(siteUrl);
  if (!known) {
    known = whoAmI(context, siteUrl).then((me) => ({ userId: me.userId, fullName: me.fullName }));
    // A failure (no session yet) isn't remembered: the next call tries again.
    known.catch(() => selves.delete(siteUrl));
    selves.set(siteUrl, known);
  }
  return known;
}

/**
 * People from Moodle as the agent may see them, in the same order: under `pseudonymize`, each one
 * remembered in the local directory (one write for the list) and given as its alias, the person
 * themselves left as they are; otherwise unchanged.
 */
export async function people(config: Config, context: BrowserContext, siteUrl: string, list: { userId: number; fullName: string }[]): Promise<Person[]> {
  if (!pseudonymizing(config)) return list.map(({ userId, fullName }) => ({ userId, fullName }));
  const me = await self(context, siteUrl);
  const others = list.filter((p) => p.userId !== me.userId);
  const service = serviceOf(siteUrl);
  const aliases = others.length > 0 ? await remember(others.map((p) => ({ service, identifiers: { serviceUserId: String(p.userId) }, displayName: p.fullName }))) : [];
  const byId = new Map(others.map((p, i) => [p.userId, aliases[i]!]));
  return list.map((p) => (p.userId === me.userId ? { userId: p.userId, fullName: p.fullName } : { alias: byId.get(p.userId)! }));
}

/**
 * A name Moodle shows without its user id (a forum list's author): the alias of someone the directory
 * knows by it, the person's own name as it is, or `[participant]`: never a name in clear.
 */
export async function personByName(config: Config, context: BrowserContext, siteUrl: string, name: string): Promise<string> {
  if (!pseudonymizing(config) || name.trim() === "") return name;
  if (name === (await self(context, siteUrl)).fullName) return name;
  // Only a name the directory knows whole becomes an alias; anything left over could still name someone.
  const { text } = await redact(name.trim(), { service: serviceOf(siteUrl) });
  return ALIAS.test(text) ? text : "[participant]";
}

/** Free text others wrote, under `pseudonymize`: known people as aliases, contact and identity data as placeholders. */
export async function text(config: Config, siteUrl: string, value: string): Promise<string> {
  if (!pseudonymizing(config) || value === "") return value;
  return (await redact(value, { service: serviceOf(siteUrl) })).text;
}

/** The Moodle user id behind an alias the agent gives back (a write tool's input), never shown to it. */
export async function userIdOf(siteUrl: string, alias: string): Promise<number> {
  return Number(await resolve(alias, { service: serviceOf(siteUrl) }));
}

/**
 * Text the agent writes to Moodle (feedback, a post) under `pseudonymize`: an alias in it would reach
 * people as is, since aliases aren't turned back into names yet, so it's refused before anything changes.
 */
export function refuseAliases(config: Config, ...values: (string | undefined)[]): void {
  if (!pseudonymizing(config)) return;
  const alias = values.map((v) => v?.match(/\bA-[0-9A-HJKMNP-TV-Z]{6,12}\b/)?.[0]).find(Boolean);
  if (alias) throw new Error(`The text names ${alias}, an alias: Moodle would show it as is. Write it without aliases (address the student as "you"), or ask the person to write the names.`);
}

// A user id in a link: a profile's `id`, or `userid`/`user` anywhere.
const PROFILE_ID = /(\/user\/(?:view|profile)\.php\?(?:[^\s"'\])]*?&)?id=)\d+/g;
const USER_PARAM = /([?&](?:userid|user)=)\d+/g;

/**
 * Text read off a page of the browser tools (ADR-017), under `pseudonymize`: the people the page links to
 * their profile, as Moodle prints a person, remembered with their id first, so their names become
 * aliases; then user ids in links removed and the text redacted. Otherwise unchanged.
 */
export async function pageText(config: Config, page: Page, siteUrl: string, values: string[]): Promise<string[]> {
  if (!pseudonymizing(config)) return values;
  const linked = await page.evaluate(() => {
    const found: { userId: number; fullName: string }[] = [];
    const doc = (globalThis as unknown as { document: { querySelectorAll(selector: string): ArrayLike<{ href: string; innerText: string }> } }).document;
    for (const a of Array.from(doc.querySelectorAll('a[href*="/user/view.php"], a[href*="/user/profile.php"]'))) {
      const id = Number(new URL(a.href).searchParams.get("id"));
      // The link's text; a link that is only a picture names the same person as the one beside it, which redact() then finds.
      const name = a.innerText.replace(/\s+/g, " ").trim();
      if (id > 0 && name) found.push({ userId: id, fullName: name });
    }
    return found;
  });
  const unique = [...new Map(linked.map((p) => [p.userId, p])).values()];
  if (unique.length > 0) await people(config, page.context(), siteUrl, unique);
  return Promise.all(values.map((value) => text(config, siteUrl, value.replace(PROFILE_ID, "$1[user]").replace(USER_PARAM, "$1[user]"))));
}

/** A person as tools give them: `user` (the alias) under pseudonymize, else `userId` and `fullName`. */
export const personFields = {
  user: z.string().optional().describe("The person's alias, when the server pseudonymizes; tools that act on someone take it"),
  userId: z.number().int().optional().describe("The person's user id, when the server shows names (or for the person themselves)"),
  fullName: z.string().optional(),
};

export function shown(person: Person): { user?: string; userId?: number; fullName?: string } {
  return person.alias ? { user: person.alias } : { userId: person.userId, fullName: person.fullName };
}

/** Someone a write tool acts on, as the agent gives them: `user` (an alias) under pseudonymize, else `userId`. */
export const targetFields = {
  user: z.string().optional().describe("The participant's alias, as the reading tools give it when the server pseudonymizes"),
  userId: z.number().int().positive().optional().describe("The participant's user id, when the server shows names"),
};

/** The Moodle user id behind a write tool's target, checked against the level: an alias under pseudonymize, an id otherwise. */
export async function targetUserId(config: Config, siteUrl: string, { user, userId }: { user?: string; userId?: number }): Promise<number> {
  const pseudonymous = pseudonymizing(config);
  if (pseudonymous ? user === undefined || userId !== undefined : userId === undefined || user !== undefined)
    throw new Error(pseudonymous ? "This server pseudonymizes: give the participant as user, the alias the reading tools give." : "Give the participant as userId, as the reading tools give it.");
  return user !== undefined ? userIdOf(siteUrl, user) : userId!;
}

/** How a result names the target: the alias the agent gave, or the user id. */
export function targetName({ user, userId }: { user?: string; userId?: number }): string {
  return user ?? `user ${userId}`;
}

/** Several people a write tool acts on: `users` (aliases) under pseudonymize, else `userIds`. */
export const targetsFields = {
  users: z.array(z.string()).min(1).optional().describe("The participants' aliases, as the reading tools give them when the server pseudonymizes"),
  userIds: z.array(z.number().int().positive()).min(1).optional().describe("The participants' user ids, when the server shows names"),
};

export async function targetUserIds(config: Config, siteUrl: string, { users, userIds }: { users?: string[]; userIds?: number[] }): Promise<number[]> {
  const pseudonymous = pseudonymizing(config);
  if (pseudonymous ? !users || userIds : !userIds || users)
    throw new Error(pseudonymous ? "This server pseudonymizes: give the participants as users, the aliases the reading tools give." : "Give the participants as userIds, as the reading tools give them.");
  return users ? Promise.all(users.map((alias) => userIdOf(siteUrl, alias))) : userIds!;
}

export function targetsName({ users, userIds }: { users?: string[]; userIds?: number[] }): string {
  return (users ?? (userIds ?? []).map((id) => `user ${id}`)).join(", ");
}

/**
 * People the driver gives by user id only (a group's members, who a message reached), as tools give
 * people: their names come from the course's participants, read once, so each gets an alias or a name.
 */
export async function peopleByIds(config: Config, context: BrowserContext, siteUrl: string, courseId: number, ids: number[]): Promise<Map<number, ReturnType<typeof shown>>> {
  if (ids.length === 0) return new Map();
  const everyone = await participants(context, siteUrl, courseId);
  const who = await people(config, context, siteUrl, everyone);
  const byId = new Map(everyone.map((p, i) => [p.userId, shown(who[i]!)]));
  return new Map(ids.map((id) => [id, byId.get(id) ?? (pseudonymizing(config) ? { user: "[participant]" } : { userId: id })]));
}

// Joins a result's strings for one redact() call (one read of the directory): a line nothing redacts across.
const SEPARATOR = "\n␞\n";
// A user by id in text: "user 7", "users 7, 8", "user with id '7'".
const USER_IDS = /\b(users?)((?: with ids?)?) '?\d+'?(?:(?:, | and )'?\d+'?)*/gi;

/**
 * Many strings at once, under `pseudonymize`: user ids in them hidden (in text and in links), then known
 * people to aliases and contact and identity data to placeholders, in one redact() call; a link is
 * only stripped of user ids, so it still works. Unchanged otherwise.
 */
export async function redactAll(config: Config, siteUrl: string, values: string[]): Promise<string[]> {
  if (!pseudonymizing(config) || values.length === 0) return values;
  const hidden = values.map((v) => v.replace(PROFILE_ID, "$1[user]").replace(USER_PARAM, "$1[user]").replace(USER_IDS, "$1$2 [user]"));
  const isLink = (v: string) => /^https?:\/\/\S+$/.test(v);
  const prose = hidden.filter((v) => !isLink(v));
  if (prose.length === 0) return hidden;
  const joined = (await redact(prose.join(SEPARATOR), { service: serviceOf(siteUrl) })).text.split(SEPARATOR);
  // A redaction that ran across the separator would misalign them: then one call each.
  const redacted = joined.length === prose.length ? joined : await Promise.all(prose.map(async (v) => (await redact(v, { service: serviceOf(siteUrl) })).text));
  let next = 0;
  return hidden.map((v) => (isLink(v) ? v : redacted[next++]!));
}
