import type { Page } from "playwright-core";
import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { pause, readingSeconds } from "../moodle/pace.js";
import { openSitePage } from "../moodle/session.js";
import { readTexts } from "../moodle/text.js";
import type { RegisterTool } from "./types.js";

const TYPES = ["page", "book", "label", "url", "resource", "folder"] as const;
type ContentType = (typeof TYPES)[number];

// A book has a reasonable number of chapters; the bound stops a loop on a broken "next" link.
const MAX_CHAPTERS = 200;

const inputSchema = {
  activityId: z.number().int().positive().describe("The activity's id (course module id), as get_course_structure gives it"),
  type: z.enum(TYPES).describe("The activity's type, as get_course_structure gives it"),
};

const link = z.object({ name: z.string(), url: z.string() });

const outputSchema = {
  activity: z.object({ id: z.number().int(), type: z.enum(TYPES) }),
  text: z.string().optional().describe("Page and label content, as plain text with paragraphs and lists kept"),
  chapters: z.array(z.object({ title: z.string(), text: z.string() })).optional().describe("A book's chapters, in order"),
  url: z.string().optional().describe("A URL resource's target"),
  files: z.array(link).optional().describe("A file resource's or a folder's files"),
  trail: z.enum(["realistic", "fast"]).describe("How it was read: realistic viewed it page by page at a reader's pace"),
  readingSeconds: z.number().optional().describe("With the realistic trail, the time spent reading"),
};

type Output = z.infer<z.ZodObject<typeof outputSchema>>;

/** The activity isn't of the given type, or the person can't view it. */
export class NotViewableError extends Error {
  override name = "NotViewableError";
}

async function links(page: Page, selector: string): Promise<{ name: string; url: string }[]> {
  return page.evaluate((selector) => {
    const anchors = (globalThis as unknown as { document: { querySelectorAll(s: string): ArrayLike<{ textContent: string | null; href: string }> } }).document.querySelectorAll(
      selector,
    );
    return Array.from(anchors).map((a) => ({ name: (a.textContent ?? "").replace(/\s+/g, " ").trim(), url: a.href }));
  }, selector);
}

/** A book chapter's title and text, the title taken off the text's start. */
function chapter(title: string, body: string): { title: string; text: string } {
  return { title, text: body.startsWith(title) ? body.slice(title.length).trim() : body };
}

export const registerGetActivityContent: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_activity_content",
    {
      title: "Read an activity's content",
      description:
        "Read a content activity as a person would, so Moodle logs the view: a page's or label's text, a book's chapters, a URL resource's target, or a file resource's or folder's files (as links). Takes the id and type from get_course_structure. With the realistic trail it reads page by page at a reader's pace and reports progress.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ activityId, type }, extra) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const realistic = config.trail === "realistic";
      const output: Output = { activity: { id: activityId, type }, trail: config.trail };

      // Clients that pass a progress token keep waiting while the reading pauses report progress.
      const progressToken = extra._meta?.progressToken;
      let secondsRead = 0;
      const readAsAPerson = async (text: string) => {
        if (!realistic) return;
        const seconds = readingSeconds(text);
        await pause(seconds, (elapsed) => {
          if (progressToken === undefined) return;
          void extra
            .sendNotification({ method: "notifications/progress", params: { progressToken, progress: secondsRead + elapsed, message: "Reading at a person's pace" } })
            .catch(() => undefined);
        });
        secondsRead += seconds;
      };

      // Opens the activity's page and checks it shows what this type should.
      const view = async (path: string, ready: string): Promise<Page> => {
        const page = await openSitePage(context, siteUrl, path);
        if ((await page.locator(ready).count()) === 0) {
          await page.close().catch(() => undefined);
          throw new NotViewableError(`Activity ${activityId} isn't a ${type satisfies ContentType} you can view. Take its id and type from get_course_structure.`);
        }
        return page;
      };

      if (type === "page" || type === "label") {
        const path = type === "page" ? `mod/page/view.php?id=${activityId}` : `mod/label/view.php?id=${activityId}`;
        const selector = type === "page" ? "#region-main .generalbox" : `[data-for="cmitem"][data-id="${activityId}"] .activity-altcontent`;
        const page = await view(path, selector);
        output.text = (await readTexts(page, selector))[0] ?? "";
        await page.close();
        await readAsAPerson(output.text);
      } else if (type === "book") {
        output.chapters = [];
        if (realistic) {
          // Chapter by chapter, following "next", as a reader does.
          const page = await view(`mod/book/view.php?id=${activityId}`, "#region-main .book_content");
          try {
            for (let i = 0; i < MAX_CHAPTERS; i++) {
              const title = (await readTexts(page, "#region-main .book_content h3, #region-main .book_content h2"))[0] ?? "";
              const read = chapter(title, (await readTexts(page, "#region-main .book_content"))[0] ?? "");
              output.chapters.push(read);
              await readAsAPerson(read.text);
              const next = page.locator("#region-main a.btn-next").first();
              if ((await next.count()) === 0) break;
              await page.goto((await next.getAttribute("href"))!, { waitUntil: "domcontentloaded" });
            }
          } finally {
            await page.close().catch(() => undefined);
          }
        } else {
          const page = await view(`mod/book/tool/print/index.php?id=${activityId}`, ".book_chapter");
          const titles = await readTexts(page, ".book_chapter h2, .book_chapter h3");
          const bodies = await readTexts(page, ".book_chapter");
          output.chapters = bodies.map((body, i) => chapter(titles[i] ?? "", body));
          await page.close();
        }
      } else if (type === "url") {
        // forceview logs the view and shows the link instead of leaving the site.
        const page = await view(`mod/url/view.php?id=${activityId}&forceview=1`, ".urlworkaround a");
        output.url = (await links(page, ".urlworkaround a"))[0]?.url;
        await page.close();
      } else {
        const [path, selector] =
          type === "resource"
            ? [`mod/resource/view.php?id=${activityId}&forceview=1`, ".resourceworkaround a"]
            : [`mod/folder/view.php?id=${activityId}`, '.foldertree a[href*="pluginfile.php"]'];
        const page = await view(path, selector);
        output.files = await links(page, selector);
        await page.close();
      }

      if (secondsRead > 0) output.readingSeconds = secondsRead;
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
