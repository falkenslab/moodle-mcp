import { z } from "zod";
import { ConfigError, atLeastAsStrict, parseCourseUrl, parseProfileDir, parseScopeSetting, type Classroom } from "../config.js";
import { addSite, useSite } from "../sites.js";
import { findMoodleSite } from "@falkenslab/moodle-driver";
import { ROLES, roleWithin } from "./roles.js";
import { ACCESS_LEVELS, STUDENT_DATA_LEVELS, applyScopes } from "./scopes.js";
import { serverInfo, serverInfoSchema } from "./serverInfo.js";
import type { RegisterTool } from "./types.js";
import type { Config } from "../config.js";

const inputSchema = {
  url: z.string().optional().describe("The Moodle site's URL, or any page of it (a course URL works: the site is read from it)"),
  headless: z.boolean().optional().describe("Run the browser without a window (logging in always shows one)"),
  trail: z.enum(["realistic", "fast"]).optional().describe("How student tools view and do things: realistic (real pages, human pace; Moodle logs views and completion) or fast"),
  profileDir: z.string().optional().describe("Absolute folder for the browser profile that keeps the Moodle session; outside the server's folder"),
  scopes: z.string().optional().describe("Narrow the kinds of tools for this session: a profile (teacher, student, content) or scopes (content, student-data, grading, communication, as-student, browser). Only fewer than now, never more"),
  studentData: z.enum(STUDENT_DATA_LEVELS).optional().describe("Tighten how others' data reaches you for this session (block is strictest). Only stricter than now, never looser"),
  role: z.enum(ROLES).optional().describe("Keep only one role's tools for this session (teacher or student), from all; never back to all"),
  access: z.enum(ACCESS_LEVELS).optional().describe("read: keep only the tools that change nothing in Moodle for this session; never back to write"),
  courses: z.array(z.string()).optional().describe("Keep the agent to these courses for this session, by URL (…/course/view.php?id=N), on the server's sites: among the classrooms the person set, if any (ADR-025)"),
};

/**
 * Settings given at run time, in memory only: the server stores nothing (ADR-009). Everything is
 * validated before anything changes, so a bad value leaves the previous configuration.
 */
export const registerConfigure: RegisterTool = (server, context) => {
  server.registerTool(
    "configure",
    {
      title: "Configure the server",
      description:
        "Set this server's configuration for this session: the Moodle site (url; a new one is added to the server's sites and kept, a known one becomes active, see use_site), whether the browser runs without a window (headless), how student tools view and do things (trail) and the browser profile folder (profileDir). It can also narrow the kinds of tools (scopes), the role (role), access to read only (access) or the courses it works in (courses) and tighten how others' data reaches you (studentData), never the other way: widening is the person's, in the client's configuration. Each is optional; only those given change. The URL is checked to be a Moodle site. Kept in memory only, but for a new site, which stays among the server's sites. Returns the effective configuration, as server_info.",
      inputSchema,
      outputSchema: serverInfoSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ url, headless, profileDir, trail, scopes, studentData, role, access, courses }) => {
      const { config, browser } = context;
      // Narrowing only, and only from where the session is now: the agent can't undo what the person set (ADR-015, ADR-016).
      const narrowed = scopes !== undefined ? parseScopeSetting(scopes) : undefined;
      const wider = narrowed?.filter((scope) => !config.scopes.includes(scope)) ?? [];
      if (wider.length > 0) throw new ConfigError(`configure can only narrow the scopes: ${wider.join(", ")} isn't allowed now (${config.scopes.join(", ")}). Widening is the person's, in the client's configuration of the server.`);
      if (studentData !== undefined && !atLeastAsStrict(studentData, config.studentData)) {
        throw new ConfigError(`configure can only tighten student data: it's ${config.studentData} now. Loosening it is the person's, in the client's configuration of the server.`);
      }
      if (access === "write" && config.access === "read") {
        throw new ConfigError("configure can only narrow access to read: it's read now. Allowing changes is the person's, in the client's configuration of the server.");
      }
      if (role !== undefined && !roleWithin(role, config.role)) {
        throw new ConfigError(`configure can only narrow the role: it's ${config.role} now. Changing it otherwise is the person's, in the client's configuration of the server.`);
      }
      const classrooms = courses !== undefined ? narrowClassrooms(courses, context.config) : undefined;
      if (url !== undefined && config.classrooms) throw new ConfigError("With classrooms, the sites are theirs: switch between them with use_site. Adding a site is the person's, in the client's configuration of the server.");
      const moodleUrl = url !== undefined ? await findMoodleSite(url) : undefined;
      const dir = profileDir !== undefined ? parseProfileDir(profileDir) : undefined;

      // The browser's profile and mode are fixed at launch: close it, and the next tool reopens it.
      const relaunch = (dir !== undefined && dir !== config.profileDir) || (headless !== undefined && headless !== config.headless);
      if (relaunch) await browser.close();

      // A site is one of the server's sites (ADR-021): a known one becomes active, a new one is added and kept.
      if (moodleUrl !== undefined) {
        const site = config.sites.find((s) => s.url === moodleUrl) ?? addSite(config, moodleUrl);
        await useSite(config, browser, site.name);
        config.sources.moodleUrl = "configure";
      }
      if (dir !== undefined) {
        config.profileDir = dir;
        config.sources.profileDir = "configure";
        // For this session, the active site's profile too.
        const active = config.sites.find((s) => s.name === config.activeSite);
        if (active) active.profileDir = dir;
      }
      if (trail !== undefined) {
        config.trail = trail;
        config.sources.trail = "configure";
      }
      if (headless !== undefined) {
        config.headless = headless;
        config.sources.headless = "configure";
      }
      if (narrowed !== undefined) {
        config.scopes = narrowed;
        config.sources.scopes = "configure";
      }
      if (studentData !== undefined) {
        config.studentData = studentData;
        config.sources.studentData = "configure";
      }
      if (role !== undefined) {
        config.role = role;
        config.sources.role = "configure";
      }
      if (access !== undefined) {
        config.access = access;
        config.sources.access = "configure";
      }
      if (classrooms !== undefined) {
        config.classrooms = classrooms;
        config.sources.classrooms = "configure";
      }
      if (narrowed !== undefined || studentData !== undefined || role !== undefined || access !== undefined || classrooms !== undefined) applyScopes(server, config);

      const info = serverInfo(context);
      return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }], structuredContent: info };
    },
  );
};

/** The classrooms a configure call asks for: courses on the server's sites, and among the classrooms in force, if any (ADR-025). */
function narrowClassrooms(courses: string[], config: Config): Classroom[] {
  if (courses.length === 0) throw new ConfigError("courses needs at least one course's URL.");
  return courses.map((value) => {
    const { siteUrl, courseId, url } = parseCourseUrl(value);
    const site = config.sites.find((s) => s.url === siteUrl);
    if (!site) throw new ConfigError(`${value} isn't on any of the server's sites (${config.sites.map((s) => s.url).join(", ") || "none"}).`);
    if (config.classrooms && !config.classrooms.some((c) => c.site === site.name && c.courseId === courseId)) {
      throw new ConfigError(`configure can only narrow the classrooms: ${value} isn't one of them now. Adding one is the person's, in the client's configuration of the server.`);
    }
    return { site: site.name, courseId, url };
  });
}
