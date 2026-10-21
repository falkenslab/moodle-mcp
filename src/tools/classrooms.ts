// Classrooms (ADR-025): with MOODLE_MCP_COURSES the agent works only in the person's courses. A
// course id must be one of them; any other id must be one the server has seen, with its kind, in a
// tool's output from a classroom in this session; lists across courses keep only the classrooms'.
// Nothing asks Moodle which course an id belongs to.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";

type Args = Record<string, unknown>;
type Handler = (args: Args, extra: unknown) => Promise<unknown>;
type Result = { content?: { type: string; text?: string }[]; structuredContent?: unknown; isError?: boolean };

/** Ids that name a course module: every activity tool's own id is one, and a 5.x question bank too. */
const ACTIVITY = new Set(["activity", "quiz", "assignment", "forum", "glossary", "feedback", "database", "workshop", "book", "lesson", "wiki", "choice", "bank", "scorm", "h5p", "survey", "bigbluebutton"]);
/** Other names for the same kind. */
const ALIASES: Record<string, string> = {
  reviewer: "user", author: "user", participant: "user", marker: "user", respondent: "user", member: "user", add: "user", remove: "user",
  gradeItem: "item", column: "item",
};
/**
 * Not any course's: roles, scales, competencies and their frameworks, cohorts, and people, who reach the
 * agent as aliases and are acted on through a course or an activity, which is checked.
 */
export const SITE_WIDE = new Set(["role", "scale", "competency", "framework", "cohort", "user"]);
/** Ids that aren't Moodle's or aren't checked: a backup file's, an instance's. */
const IGNORED = new Set(["forumInstance", "subwiki", "message", "conversation", "notification", "response", "evidence"]);

/** The kind of an id field, from its name: `activityIds` and `quizId` are activities, `toSectionId` a section. */
export function idKind(field: string): string | undefined {
  const match = /^(.*?)Ids?$/.exec(field);
  if (!match?.[1]) return undefined;
  let name = match[1];
  // Where it goes or comes from isn't its kind: toAfterSectionId is a section.
  for (let stripped = true; stripped; ) {
    const prefix = /^(from|to|into|after|before|parent)(?=[A-Z])/.exec(name);
    stripped = prefix !== null;
    if (prefix) name = name[prefix[0].length]!.toLowerCase() + name.slice(prefix[0].length + 1);
  }
  if (name === "parent") return "category";
  return kindOf(name);
}

/** The kind of the items in a collection or the object under a key: `activities` and `quiz` are activities. */
export function collectionKind(key: string): string | undefined {
  const singular = key.endsWith("ies") ? `${key.slice(0, -3)}y` : key.endsWith("s") ? key.slice(0, -1) : key;
  return kindOf(singular);
}

function kindOf(name: string): string | undefined {
  if (IGNORED.has(name)) return undefined;
  if (ACTIVITY.has(name)) return "activity";
  return ALIASES[name] ?? name;
}

/** The ids seen per site and kind, for the session. */
type Seen = Map<string, Map<string, Set<number | string>>>;

function seenOf(seen: Seen, site: string, kind: string): Set<number | string> {
  let kinds = seen.get(site);
  if (!kinds) seen.set(site, (kinds = new Map()));
  let ids = kinds.get(kind);
  if (!ids) kinds.set(kind, (ids = new Set()));
  return ids;
}

/** The classrooms' course ids on a site. */
function coursesOn(config: Config, site: string | undefined): Set<number> {
  return new Set((config.classrooms ?? []).filter((c) => c.site === site).map((c) => c.courseId));
}

/** The ids an input holds, with the site each is on: copy_between_sites' to… ids are on its toSite. */
function inputIds(args: Args, config: Config): { field: string; kind: string; id: number; site: string | undefined }[] {
  const from = typeof args.fromSite === "string" ? args.fromSite : config.activeSite;
  const to = typeof args.toSite === "string" ? args.toSite : config.activeSite;
  const found: { field: string; kind: string; id: number; site: string | undefined }[] = [];
  const walk = (node: unknown, top: boolean) => {
    if (Array.isArray(node)) return node.forEach((item) => walk(item, false));
    if (!node || typeof node !== "object") return;
    for (const [field, value] of Object.entries(node)) {
      const kind = idKind(field);
      const ids = typeof value === "number" ? [value] : Array.isArray(value) && value.every((v) => typeof v === "number") ? (value as number[]) : undefined;
      if (kind && ids) for (const id of ids) found.push({ field, kind, id, site: top && /^to[A-Z]/.test(field) ? to : from });
      else walk(value, false);
    }
  };
  walk(args, true);
  return found;
}

/**
 * Records the ids of an output under their kinds. `id` and `parentId` take their container's kind
 * (`activities[].id`), an `…Id` field its own; a top-level `id` is the input's, seen already.
 */
function record(ids: (kind: string) => Set<number | string>, node: unknown, kind: string | undefined, siteUrl: string | undefined): void {
  if (Array.isArray(node)) return node.forEach((item) => record(ids, item, kind, siteUrl));
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    const own = key === "id" || key === "parentId" ? kind : idKind(key);
    if (typeof value === "number") {
      if (own && own !== "course") ids(own).add(value);
    } else if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "number")) {
      if (own && own !== "course") for (const v of value as number[]) ids(own).add(v);
    } else if (typeof value === "string") {
      // A file's or a page's address on the site, for download_file.
      if (siteUrl && value.startsWith(siteUrl)) ids("url").add(value);
    } else record(ids, value, collectionKind(key), siteUrl);
  }
}

/** The course an item of a list belongs to, when it says. */
function courseOfItem(item: unknown): number | undefined {
  if (!item || typeof item !== "object") return undefined;
  const { courseId, course } = item as { courseId?: unknown; course?: unknown };
  if (typeof courseId === "number") return courseId;
  if (course && typeof course === "object" && typeof (course as { id?: unknown }).id === "number") return (course as { id: number }).id;
  return undefined;
}

/**
 * The output with the lists' items of other courses left out (an item's courseId, course.id, or a
 * course's own id under `courses`), and the items kept that said their course: those a call not
 * tied to a classroom may record.
 */
function filter(node: unknown, courses: Set<number>, key: string, kept: { item: unknown; kind: string | undefined }[]): unknown {
  if (Array.isArray(node)) {
    const out = [];
    for (const item of node) {
      const course = key === "courses" && item && typeof item === "object" && typeof (item as { id?: unknown }).id === "number" ? (item as { id: number }).id : courseOfItem(item);
      if (course !== undefined && !courses.has(course)) continue;
      if (course !== undefined) kept.push({ item, kind: collectionKind(key) });
      out.push(filter(item, courses, key, kept));
    }
    return out;
  }
  if (!node || typeof node !== "object") return node;
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, filter(v, courses, k, kept)]));
}

/** Why an id is refused, and how to get one the server accepts. */
function refusal(tool: string, field: string, kind: string, id: number, site: string | undefined, config: Config): string {
  if (kind === "course") return `${tool}: course ${id} isn't one of the classrooms this server works in (${(config.classrooms ?? []).filter((c) => c.site === site).map((c) => c.courseId).join(", ") || "none on this site"}). Only the person can change them, in the client's configuration (MOODLE_MCP_COURSES).`;
  return `${tool}: ${field} ${id} hasn't come from one of the classrooms in this session, and this server only acts on ids it has read there. Read it first from its course (get_course_structure gives activities and sections, list_discussions discussions, list_participants people…), then retry.`;
}

/**
 * Holds every tool registered on `server` from now on to the classrooms, while there are any (ADR-025):
 * inputs checked before anything runs, outputs filtered and their ids recorded. Installed before
 * confirmTools, so a refused call asks the person nothing, and inside the pseudonymization net, so
 * it records the ids as Moodle gave them.
 */
export function classroomTools(server: McpServer, config: Config): void {
  const seen: Seen = new Map();
  const register = server.registerTool.bind(server) as (name: string, settings: unknown, handler: Handler) => unknown;
  (server as unknown as { registerTool: typeof register }).registerTool = (name, settings, handler) => {
    // A tool without inputs gets the request's extra as its only argument: nothing to check in it.
    const takesInput = (settings as { inputSchema?: unknown }).inputSchema !== undefined;
    return register(name, settings, async (args, extra) => {
      if (!config.classrooms) return handler(args, extra);
      let anchored = false;
      for (const { field, kind, id, site } of takesInput ? inputIds(args ?? {}, config) : []) {
        if (SITE_WIDE.has(kind)) continue;
        const allowed =
          kind === "course" ? coursesOn(config, site).has(id) : seenOf(seen, site ?? "", kind).has(id) || (field === "bankId" && coursesOn(config, site).has(id)); // A 4.x bank's id is its course's.
        if (!allowed) throw new Error(refusal(name, field, kind, id, site, config));
        anchored = true;
      }
      if (typeof args?.url === "string" && name === "download_file" && !seenOf(seen, config.activeSite ?? "", "url").has(args.url)) {
        throw new Error(`download_file: that address hasn't come from one of the classrooms in this session, and this server only downloads what it has read there. Read it first (get_submissions, get_activity_content…), then retry.`);
      }
      const result = (await handler(args, extra)) as Result;
      if (!result || result.isError || result.structuredContent === undefined) return result;
      const site = config.activeSite ?? "";
      const ids = (kind: string) => seenOf(seen, site, kind);
      const kept: { item: unknown; kind: string | undefined }[] = [];
      const structuredContent = filter(result.structuredContent, coursesOn(config, site), "", kept);
      // A call tied to a classroom gives that classroom's ids; another, only those its lists said were.
      if (anchored) record(ids, structuredContent, undefined, config.moodleUrl);
      else for (const { item, kind } of kept) record(ids, [item], kind, config.moodleUrl);
      const echoes = JSON.stringify(result.structuredContent, null, 2);
      const content = (result.content ?? []).map((c) => (c.type === "text" && c.text === echoes ? { ...c, text: JSON.stringify(structuredContent, null, 2) } : c));
      return { ...result, content, structuredContent };
    });
  };
}
