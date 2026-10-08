import type { BrowserContext, Page } from "playwright-core";

/** No live Moodle session: the client should have the person log in (ADR-002). */
export class NotLoggedInError extends Error {
  override name = "NotLoggedInError";
  constructor() {
    super("There is no Moodle session, or it expired. Call the login tool so the person can log in in the browser window it opens, then retry.");
  }
}

/** What a Moodle page says about its session, read without depending on the interface's language. */
export interface SessionFacts {
  /** Moodle adds the `notloggedin` body class when nobody is logged in. */
  notLoggedIn: boolean;
  /** `M.cfg.userId`: 0 when logged out; `null` on a page that isn't Moodle's (an SSO provider's). */
  userId: number | null;
  /** A logout link: present for a real user, absent for a guest, who also has a user id. */
  hasLogoutLink: boolean;
}

export function readSessionFacts(page: Page): Promise<SessionFacts> {
  return page.evaluate(() => {
    // Runs in the page: Moodle's globals and the DOM, typed loosely on purpose (no DOM lib in Node).
    const g = globalThis as unknown as {
      M?: { cfg?: { userId?: unknown } };
      document: { body: { classList: { contains(name: string): boolean } } | null; querySelector(selector: string): unknown };
    };
    const userId = g.M?.cfg?.userId;
    return {
      notLoggedIn: g.document.body?.classList.contains("notloggedin") ?? true,
      userId: typeof userId === "number" ? userId : null,
      hasLogoutLink: g.document.querySelector('a[href*="/login/logout.php"]') !== null,
    };
  });
}

/** Whether a page at `url`, with these facts, belongs to the site and has a real user logged in. */
export function isLoggedIn(url: string, siteUrl: string, facts: SessionFacts): boolean {
  if (!url.startsWith(siteUrl)) return false;
  if (url.startsWith(new URL("login/", siteUrl).href)) return false;
  return !facts.notLoggedIn && (facts.userId ?? 0) > 0 && facts.hasLogoutLink;
}

/** Whether `page`, as it is now, shows the site with a real user logged in. */
export async function pageIsLoggedIn(page: Page, siteUrl: string): Promise<boolean> {
  return isLoggedIn(page.url(), siteUrl, await readSessionFacts(page));
}

/**
 * Opens a page of the site (`path` relative to it) in a new tab and checks the session; throws
 * `NotLoggedInError`, closing the tab, when Moodle answers with its login page.
 */
export async function openSitePage(context: BrowserContext, siteUrl: string, path: string): Promise<Page> {
  const page = await context.newPage();
  try {
    await page.goto(new URL(path, siteUrl).href, { waitUntil: "domcontentloaded" });
    if (!(await pageIsLoggedIn(page, siteUrl))) throw new NotLoggedInError();
    return page;
  } catch (error) {
    await page.close().catch(() => undefined);
    throw error;
  }
}
