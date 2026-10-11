// Other people as the agent sees them (ADR-013, ADR-016): with `pseudonymize`, a stable alias from
// @falkenslab/pseudonym instead of a name or a Moodle user id, and free text redacted; with `clear`,
// as Moodle shows them. The person's own data stays visible.
import type { BrowserContext, Page } from "playwright-core";
import { redact, remember, resolve } from "@falkenslab/pseudonym";
import { whoAmI } from "@falkenslab/moodle-driver";
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
