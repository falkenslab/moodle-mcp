import { chromium, type Browser, type BrowserContext, type Route } from "playwright-core";

export const SITE = "http://moodle.test/";

/**
 * A Moodle page reduced to what the server reads: the body class, `M.cfg.userId`, the logout link in
 * the user menu and the page heading, as Moodle 5.2 renders them.
 */
export function moodlePage({ userId, heading = "Dashboard", guest = false }: { userId: number; heading?: string; guest?: boolean }): string {
  const loggedIn = userId > 0;
  return `<!DOCTYPE html><html><head><title>${heading}</title>
<script>var M = {}; M.cfg = {"wwwroot":"http:\\/\\/moodle.test","userId":${userId}};</script></head>
<body class="${loggedIn ? "" : "notloggedin"}">
<nav>${loggedIn && !guest ? '<div class="usermenu"><a href="http://moodle.test/login/logout.php?sesskey=x">Log out</a></div>' : '<a href="http://moodle.test/login/index.php">Log in</a>'}</nav>
<div id="page-header"><div class="page-header-headings"><h1>${heading}</h1></div></div>
</body></html>`;
}

/** The first system browser that launches headless, or `undefined` (tests needing it are skipped). */
export async function launchTestBrowser(): Promise<Browser | undefined> {
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      // Try the next one.
    }
  }
  return undefined;
}

/**
 * Serves a fake Moodle at `SITE` in `context`: logged out, every page is the login page, as with
 * Moodle's forced login (served in place: Playwright doesn't route the request after a redirect it
 * fulfilled, confirmed empirically); `state.user` logs someone in.
 */
export async function serveFakeMoodle(context: BrowserContext, state: { user?: { id: number; fullName: string } }): Promise<void> {
  await context.route(`${SITE}**`, async (route: Route) => {
    const url = new URL(route.request().url());
    const html = (body: string) => route.fulfill({ status: 200, contentType: "text/html", body });
    if (!state.user) return html(moodlePage({ userId: 0, heading: "Log in" }));
    const heading = url.pathname === "/user/profile.php" ? state.user.fullName : "Dashboard";
    return html(moodlePage({ userId: state.user.id, heading }));
  });
}
