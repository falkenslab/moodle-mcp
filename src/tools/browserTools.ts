// The browser fallback tools (ADR-010): generic actions on one tab of the server's own session, for
// what no domain tool covers. The guards live here, in code: the site only, no password fields,
// capped snapshots, no script evaluation.
import { access } from "node:fs/promises";
import path from "node:path";
import type { Locator, Page } from "playwright-core";
import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { NotLoggedInError, readSessionFacts } from "@falkenslab/moodle-driver";
import type { RegisterTool, ToolContext } from "./types.js";

/** Snapshots longer than this are cut: whole Moodle pages overflowed clients' limits in real runs. */
export const SNAPSHOT_LIMIT = 30_000;
const ACTION_TIMEOUT_MS = 10_000;

/** A tool's misuse of the browser tools that the guards refuse. */
export class BrowserToolError extends Error {
  override name = "BrowserToolError";
}

/** Whether `url` is on the configured site (its origin, files and media included). */
export function onSite(url: string, siteUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

// Tabs already guarded (the route is added once per tab), and the last navigation each one blocked.
const guarded = new WeakSet<Page>();
const blocked = new WeakMap<Page, string>();

/**
 * The working tab, guarded so its page never leaves the site: a navigation of the page itself to
 * another origin (typed, clicked or redirected) is blocked. Frames inside the page (an H5P or a
 * video player) are left alone.
 */
async function siteTab({ browser, config }: ToolContext): Promise<Page> {
  requireSiteUrl(config);
  const page = await browser.tab();
  if (!guarded.has(page)) {
    guarded.add(page);
    await page.route("**/*", (route) => {
      const request = route.request();
      const site = config.moodleUrl;
      if (site && request.isNavigationRequest() && request.frame() === page.mainFrame() && !onSite(request.url(), site)) {
        blocked.set(page, request.url());
        // Cancelled (ERR_ABORTED), the page stays where it was; another error would show the browser's error page.
        return route.abort("aborted");
      }
      return route.fallback();
    });
  }
  return page;
}

/** Where the tab is now, as every action reports it. */
async function where(page: Page) {
  return { url: page.url(), title: await page.title().catch(() => "") };
}

/** An element from the latest snapshot, explaining a stale or unknown ref. */
function byRef(page: Page, ref: string): Locator {
  if (!/^[a-z0-9]+$/i.test(ref)) throw new BrowserToolError(`"${ref}" isn't a snapshot ref (like e12): take one from browser_snapshot.`);
  return page.getByRef(ref);
}

/** Runs an action on an element, turning Playwright's ref failures into a hint to snapshot again. */
async function act<T>(ref: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    const message = (error as Error).message ?? String(error);
    if (/ref|resolved to 0 elements|Timeout/i.test(message)) throw new BrowserToolError(`Element ${ref} isn't on the page now (it changed, or the ref is stale). Take a new browser_snapshot and use its refs. (${message.split("\n")[0]})`);
    throw error;
  }
}

/**
 * Until the page has loaded and Moodle's own scripts are done (`M.util.pending_js` empty, what Moodle's
 * Behat tests wait for): the file picker, the editor and dialogs only show then. Best effort, bounded.
 */
async function moodleReady(page: Page): Promise<void> {
  await page.waitForLoadState("load", { timeout: ACTION_TIMEOUT_MS }).catch(() => undefined);
  await page
    .waitForFunction(() => !((globalThis as { M?: { util?: { pending_js?: unknown[] } } }).M?.util?.pending_js?.length ?? 0), undefined, { timeout: ACTION_TIMEOUT_MS })
    .catch(() => undefined);
}

/** After a click or a submit: the page that comes, if any, is ready to read; a blocked one is said. */
async function settle(page: Page): Promise<void> {
  await moodleReady(page);
  const away = blocked.get(page);
  blocked.delete(page);
  if (away) throw new BrowserToolError(`That leads to ${away}, outside the site: not followed. Give the link to the person instead.`);
}

/**
 * A Moodle page without a user means the session is gone (ADR-002). Pages without Moodle's frame (a
 * file, an embedded player) say nothing either way, and pass.
 */
async function checkSession(page: Page): Promise<void> {
  const facts = await readSessionFacts(page).catch(() => undefined);
  if (facts && ((facts.notLoggedIn && facts.userId !== null) || facts.userId === 0)) throw new NotLoggedInError();
}

const reply = <T extends Record<string, unknown>>(output: T) => ({ content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }], structuredContent: output });

const location = { url: z.string(), title: z.string() };
const ref = z.string().describe("The element's ref from the latest browser_snapshot, like e12");
const FALLBACK = "A fallback: use it only when no Moodle tool covers the task, and say which task, so a tool can be made for it.";
const SHARED = "Works in one tab of the server's session (the one show_browser displays; Moodle tools may move it while the browser is shown).";

export const registerBrowserNavigate: RegisterTool = (server, context) => {
  server.registerTool(
    "browser_navigate",
    {
      title: "Browser: open a page",
      description: `Open a page of the configured Moodle site in the browser tools' tab: a URL of the site, or a path relative to it. Other sites are refused. ${FALLBACK} ${SHARED}`,
      inputSchema: { url: z.string().min(1).describe("A URL of the site, or a path relative to it (course/view.php?id=3)") },
      outputSchema: location,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ url }) => {
      const site = requireSiteUrl(context.config);
      const target = new URL(url, site).href;
      if (!onSite(target, site)) throw new BrowserToolError(`Only pages of ${new URL(site).origin} can be opened; ${new URL(target).origin} isn't the site.`);
      const page = await siteTab(context);
      await page.goto(target, { waitUntil: "domcontentloaded" });
      await moodleReady(page);
      await checkSession(page);
      return reply(await where(page));
    },
  );
};

export const registerBrowserSnapshot: RegisterTool = (server, context) => {
  server.registerTool(
    "browser_snapshot",
    {
      title: "Browser: read the page",
      description: `The page in the browser tools' tab as an accessibility tree (roles, names, values), with a ref per element ([ref=e12]) for the other browser tools. By default the main region only (#region-main, where Moodle puts the content), or the whole page, or one element's subtree by ref. Cut at ${SNAPSHOT_LIMIT} characters: snapshot a narrower part when cut. ${FALLBACK}`,
      inputSchema: {
        scope: z.enum(["main", "page"]).optional().describe('"main" (default): Moodle\'s main region; "page": everything, navigation included'),
        ref: ref.optional().describe("Only this element's subtree (from a previous snapshot)"),
      },
      outputSchema: { ...location, snapshot: z.string(), truncated: z.boolean() },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ scope = "main", ref: subtree }) => {
      const page = await siteTab(context);
      const main = page.locator("#region-main");
      const root = subtree ? byRef(page, subtree) : scope === "main" && (await main.count()) > 0 ? main : page.locator("body");
      const full = await act(subtree ?? "", () => root.ariaSnapshot({ mode: "ai", timeout: ACTION_TIMEOUT_MS }));
      // Cut at a line, so no element is left half described.
      const truncated = full.length > SNAPSHOT_LIMIT;
      const snapshot = truncated ? full.slice(0, full.lastIndexOf("\n", SNAPSHOT_LIMIT)) : full;
      return reply({ ...(await where(page)), snapshot, truncated });
    },
  );
};

export const registerBrowserClick: RegisterTool = (server, context) => {
  server.registerTool(
    "browser_click",
    {
      title: "Browser: click",
      description: `Click an element of the browser tools' tab by its snapshot ref (a link, button, checkbox, tab…), and wait for the page it leads to. Links to other sites are blocked. A click can change the site (save, delete, submit): confirm with the person first, as with any Moodle change. ${FALLBACK}`,
      inputSchema: { ref, doubleClick: z.boolean().optional() },
      outputSchema: location,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ ref: target, doubleClick }) => {
      const page = await siteTab(context);
      blocked.delete(page);
      const element = byRef(page, target);
      await act(target, () => (doubleClick ? element.dblclick({ timeout: ACTION_TIMEOUT_MS }) : element.click({ timeout: ACTION_TIMEOUT_MS })));
      await settle(page);
      await checkSession(page);
      return reply(await where(page));
    },
  );
};

export const registerBrowserType: RegisterTool = (server, context) => {
  server.registerTool(
    "browser_type",
    {
      title: "Browser: type",
      description: `Fill a text field of the browser tools' tab by its snapshot ref, replacing what it holds; optionally press Enter after. Password fields are refused: the person logs in themselves (login). ${FALLBACK}`,
      inputSchema: { ref, text: z.string(), submit: z.boolean().optional().describe("Press Enter after typing") },
      outputSchema: location,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ ref: target, text, submit }) => {
      const page = await siteTab(context);
      const element = byRef(page, target);
      const kind = await act(target, () => element.evaluate((el) => `${(el as { type?: string }).type ?? ""} ${(el as { autocomplete?: string }).autocomplete ?? ""}`, undefined, { timeout: ACTION_TIMEOUT_MS }));
      if (/password|current-password|new-password/i.test(kind)) throw new BrowserToolError("That's a password field: the server never types passwords. Call login so the person logs in themselves.");
      await act(target, () => element.fill(text, { timeout: ACTION_TIMEOUT_MS }));
      if (submit) {
        await element.press("Enter");
        await settle(page);
      }
      return reply(await where(page));
    },
  );
};

export const registerBrowserSelect: RegisterTool = (server, context) => {
  server.registerTool(
    "browser_select",
    {
      title: "Browser: choose options",
      description: `Choose options in a select of the browser tools' tab by its snapshot ref, by their values or visible labels (several for a multiple select). ${FALLBACK}`,
      inputSchema: { ref, options: z.array(z.string()).min(1) },
      outputSchema: { ...location, selected: z.array(z.string()) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ ref: target, options }) => {
      const page = await siteTab(context);
      const element = byRef(page, target);
      // Each option as a value first, else as a label.
      const values = await act(target, () => element.evaluate((el, wanted) => {
        const all = Array.from((el as unknown as { options: ArrayLike<{ value: string; text: string }> }).options ?? []);
        return wanted.map((w) => all.find((o) => o.value === w)?.value ?? all.find((o) => o.text.trim() === w.trim())?.value ?? w);
      }, options, { timeout: ACTION_TIMEOUT_MS }));
      const selected = await act(target, () => element.selectOption(values, { timeout: ACTION_TIMEOUT_MS }));
      return reply({ ...(await where(page)), selected });
    },
  );
};

export const registerBrowserUpload: RegisterTool = (server, context) => {
  server.registerTool(
    "browser_upload",
    {
      title: "Browser: choose files",
      description: `Set local files on a file input of the browser tools' tab by its snapshot ref (in Moodle's file picker, the "Upload a file" input), as if the person had chosen them. Absolute paths. ${FALLBACK}`,
      inputSchema: { ref, paths: z.array(z.string()).min(1).describe("Absolute paths of local files") },
      outputSchema: location,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ ref: target, paths }) => {
      for (const file of paths) {
        if (!path.isAbsolute(file)) throw new BrowserToolError(`Give absolute paths: "${file}".`);
        await access(file).catch(() => {
          throw new BrowserToolError(`There's no file ${file}.`);
        });
      }
      const page = await siteTab(context);
      await act(target, () => byRef(page, target).setInputFiles(paths, { timeout: ACTION_TIMEOUT_MS }));
      return reply(await where(page));
    },
  );
};

export const registerBrowserScreenshot: RegisterTool = (server, context) => {
  server.registerTool(
    "browser_screenshot",
    {
      title: "Browser: screenshot",
      description: `A picture of the browser tools' tab (what's in view), or of one element by its snapshot ref. For what the accessibility tree can't tell (layout, images, a canvas); read text with browser_snapshot instead. ${FALLBACK}`,
      inputSchema: { ref: ref.optional() },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ ref: target }) => {
      const page = await siteTab(context);
      const options = { type: "jpeg" as const, quality: 70, timeout: ACTION_TIMEOUT_MS };
      const image = target ? await act(target, () => byRef(page, target).screenshot(options)) : await page.screenshot(options);
      return { content: [{ type: "image" as const, data: image.toString("base64"), mimeType: "image/jpeg" }] };
    },
  );
};

export const registerBrowserWait: RegisterTool = (server, context) => {
  server.registerTool(
    "browser_wait",
    {
      title: "Browser: wait",
      description: `Wait in the browser tools' tab until a text shows, until it's gone, or for some seconds (at most 30): for pages that load or change on their own. ${FALLBACK}`,
      inputSchema: {
        text: z.string().min(1).optional().describe("Wait until this text shows"),
        textGone: z.string().min(1).optional().describe("Wait until this text is gone"),
        seconds: z.number().positive().max(30).optional().describe("Wait this long (with a text: the most to wait; default 10)"),
      },
      outputSchema: location,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ text, textGone, seconds }) => {
      const page = await siteTab(context);
      const timeout = (seconds ?? 10) * 1000;
      try {
        if (text) await page.getByText(text).first().waitFor({ state: "visible", timeout });
        else if (textGone) await page.getByText(textGone).first().waitFor({ state: "hidden", timeout });
        else await page.waitForTimeout(timeout);
      } catch {
        throw new BrowserToolError(`"${text ?? textGone}" didn't ${text ? "show" : "go"} within ${timeout / 1000} s.`);
      }
      return reply(await where(page));
    },
  );
};

/** The fallback family, in the order clients list them. */
export const BROWSER_TOOLS: RegisterTool[] = [
  registerBrowserNavigate,
  registerBrowserSnapshot,
  registerBrowserClick,
  registerBrowserType,
  registerBrowserSelect,
  registerBrowserUpload,
  registerBrowserScreenshot,
  registerBrowserWait,
];
