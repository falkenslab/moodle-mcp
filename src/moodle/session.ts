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
  /** A logout link, in the user menu of a real user's pages. */
  hasLogoutLink: boolean;
  /** A login link: a guest (who also has a user id) gets one and no logout link. */
  hasLoginLink: boolean;
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
      hasLoginLink: g.document.querySelector('a[href*="/login/index.php"]') !== null,
    };
  });
}

/** Whether a page at `url`, with these facts, belongs to the site and has a real user logged in. */
export function isLoggedIn(url: string, siteUrl: string, facts: SessionFacts): boolean {
  if (!url.startsWith(siteUrl)) return false;
  if (url.startsWith(new URL("login/", siteUrl).href)) return false;
  // Pages without the navigation bar (the assignment grader) have neither link (confirmed empirically,
  // Moodle 5.2): only a login link without a logout one means a guest.
  const guest = facts.hasLoginLink && !facts.hasLogoutLink;
  return !facts.notLoggedIn && (facts.userId ?? 0) > 0 && !guest;
}

/** Whether `page`, as it is now, shows the site with a real user logged in. */
export async function pageIsLoggedIn(page: Page, siteUrl: string): Promise<boolean> {
  return isLoggedIn(page.url(), siteUrl, await readSessionFacts(page));
}

// While the person watches (ADR-011), a context's browser manager shows the pages tools worked on.
const followers = new WeakMap<BrowserContext, (url: string) => Promise<void>>();

/** Has `show` called with the page each tool opened, once the tool is done with it. */
export function followPages(context: BrowserContext, show: (url: string) => Promise<void>): void {
  followers.set(context, show);
}

/**
 * Opens a page of the site (`path` relative to it) in a new tab and checks the session; throws
 * `NotLoggedInError`, closing the tab, when Moodle answers with its login page.
 */
export async function openSitePage(context: BrowserContext, siteUrl: string, path: string, { follow = true } = {}): Promise<Page> {
  const page = await context.newPage();
  try {
    await page.goto(new URL(path, siteUrl).href, { waitUntil: "domcontentloaded" });
    if (!(await pageIsLoggedIn(page, siteUrl))) throw new NotLoggedInError();
    // The page as the tool opened it (a form's URL, not where posting it led), once the tool closes it.
    const opened = page.url();
    if (follow) page.once("close", () => void followers.get(context)?.(opened));
    return page;
  } catch (error) {
    await page.close().catch(() => undefined);
    throw error;
  }
}
