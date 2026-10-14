// Course content from one site to another (ADR-021, multi-site phase 2): a backup on one site and a
// restore on the other, never with people's data and naming no one, through a file on this computer
// that never passes through the model and is deleted after.
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { backupCourse, restoreCourse } from "@falkenslab/moodle-driver";
import { findSite, useSite } from "../sites.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const ids = z.array(z.number().int().positive());
const site = z.string().describe("A site's name, as list_sites gives it");

/** A step on a site without a session says which site, as the person must log in there, not on the active one. */
async function onSiteNamed<T>(name: string, step: () => Promise<T>): Promise<T> {
  try {
    return await step();
  } catch (error) {
    if ((error as Error).name === "NotLoggedInError") throw new Error(`The site "${name}" has no Moodle session: switch to it with use_site, call login there, then retry.`, { cause: error });
    throw error;
  }
}

export const registerCopyBetweenSites: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "copy_between_sites",
    {
      title: "Copy course content to another site",
      description:
        "Copy a course's content from one of this server's sites to another (list_sites): some activities (activityIds), some sections with everything in them (sectionIds), or, with neither, the whole course. Through Moodle's backup on the first site and its restore on the second, never with people's data and naming no one; the file stays on this computer, never passes through you, and is deleted after. It goes into an existing course (toCourseId): at the end of one of its sections (toSectionId), or, for sections, as new ones after toAfterSectionId; a whole course can go into a new course in a category instead (toCategoryId). Returns what was created, and warnings for what was left broken (restrictions or links to what wasn't copied) for the person to fix. Each site needs a session (use_site, then login). The active site stays the same. Within one site, use import_activities or copy_course. It can take minutes. Changes the target site: confirm with the person first.",
      inputSchema: {
        fromSite: site,
        courseId: z.number().int().positive().describe("The course to copy from, on fromSite"),
        activityIds: ids.optional().describe("Only these activities and resources, by course module id"),
        sectionIds: ids.optional().describe("Only these sections, by id, each with everything in it"),
        toSite: site,
        toCourseId: z.number().int().positive().optional().describe("An existing course on toSite to copy into"),
        toSectionId: z.number().int().positive().optional().describe("Into toCourseId: every copied activity at the end of this section"),
        toAfterSectionId: z.number().int().positive().optional().describe("Into toCourseId: copied sections as new sections after this one"),
        toCategoryId: z.number().int().positive().optional().describe("A whole course only: a new course in this category on toSite, instead of toCourseId"),
      },
      outputSchema: {
        changed: z.string(),
        fromSite: z.string(),
        toSite: z.string(),
        course: z.object({ id: z.number().int(), fullName: z.string(), shortName: z.string(), categoryId: z.number().int().optional(), url: z.string() }).describe("The course on toSite"),
        sectionIds: z.array(z.number().int()).optional().describe("The sections created on toSite"),
        activityIds: z.array(z.number().int()).optional().describe("The activities created on toSite"),
        warnings: z
          .array(
            z.object({
              activityId: z.number().int(),
              name: z.string(),
              kind: z.enum(["restriction", "link"]).describe("restriction: an access condition on something not copied; link: a link to an activity outside the course"),
              condition: z.enum(["completion", "grade", "group", "grouping"]).optional(),
              url: z.string().optional(),
              message: z.string(),
            }),
          )
          .optional()
          .describe("What the copy left broken on toSite, for the person to fix"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ fromSite, courseId, activityIds, sectionIds, toSite, toCourseId, toSectionId, toAfterSectionId, toCategoryId }) => {
      const from = findSite(config, fromSite);
      const to = findSite(config, toSite);
      if (from === to) throw new Error("Both are the same site: within one site, use import_activities or copy_course.");
      const part = Boolean(activityIds?.length || sectionIds?.length);
      if (toCourseId === undefined && toCategoryId === undefined) throw new Error("Say where to copy it: toCourseId, an existing course on toSite, or, for a whole course, toCategoryId for a new one.");
      if (toCourseId === undefined && part) throw new Error("Activities and sections go into an existing course: give toCourseId.");

      const active = config.activeSite;
      const dir = path.join(config.dataDir, "transfers");
      mkdirSync(dir, { recursive: true });
      let file: string | undefined;
      try {
        await useSite(config, browser, from.name);
        // Anonymous, the whole course too: nothing in the file names a person or the site it came from.
        const backup = await onSiteNamed(from.name, async () => backupCourse(...(await onSite(config, browser)), courseId, dir, { activities: activityIds, sections: sectionIds, anonymous: true }));
        file = backup.file.path;
        await useSite(config, browser, to.name);
        const restored = await onSiteNamed(to.name, async () =>
          restoreCourse(...(await onSite(config, browser)), file!, { into: toCourseId ?? "new", categoryId: toCategoryId, sectionId: toSectionId, afterSectionId: toAfterSectionId }),
        );
        return reply({ ...restored, changed: `${restored.changed} Copied from course ${courseId} on "${from.name}" to "${to.name}".`, fromSite: from.name, toSite: to.name });
      } finally {
        if (file) rmSync(file, { force: true });
        if (active !== undefined && config.activeSite !== active) await useSite(config, browser, active);
      }
    },
  );
};
