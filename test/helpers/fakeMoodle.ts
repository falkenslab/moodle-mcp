import { chromium, type Browser, type BrowserContext, type Route } from "playwright-core";

export const SITE = "http://moodle.test/";

/**
 * A Moodle page reduced to what the server reads: the body class, `M.cfg` (`wwwroot`, `sesskey`,
 * `userId`), the logout link in the user menu and the page heading, as Moodle 5.2 renders them.
 */
export function moodlePage({ userId, heading = "Dashboard", guest = false, sesskey = "s1" }: { userId: number; heading?: string; guest?: boolean; sesskey?: string }): string {
  const loggedIn = userId > 0;
  return `<!DOCTYPE html><html><head><title>${heading}</title>
<script>var M = {}; M.cfg = {"wwwroot":"http:\\/\\/moodle.test","sesskey":"${sesskey}","userId":${userId}};</script></head>
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

export interface FakeMoodleState {
  /** The logged-in user; none means every page is the login page. */
  user?: { id: number; fullName: string };
  /** The session's sesskey: changing it makes older tabs' service calls fail with `invalidsesskey`. */
  sesskey?: string;
  /** AJAX services by name: what each returns as `data` for its arguments. */
  services?: Record<string, (args: Record<string, unknown>) => unknown>;
  /** Every page path served, for tests that count page loads. */
  pagesServed?: string[];
  /** Every service call received. */
  serviceCalls?: { methodname: string; args: Record<string, unknown> }[];
}

/**
 * Serves a fake Moodle at `SITE` in `context`: logged out, every page is the login page, as with
 * Moodle's forced login (served in place: Playwright doesn't route the request after a redirect it
 * fulfilled, confirmed empirically); `state.user` logs someone in. `lib/ajax/service.php` answers
 * like Moodle's, exceptions included.
 */
export async function serveFakeMoodle(context: BrowserContext, state: FakeMoodleState): Promise<void> {
  await context.route(`${SITE}**`, async (route: Route) => {
    const url = new URL(route.request().url());
    const sesskey = state.sesskey ?? "s1";
    if (url.pathname === "/lib/ajax/service.php") {
      const json = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      const [request] = JSON.parse(route.request().postData() ?? "[]") as { methodname: string; args: Record<string, unknown> }[];
      if (!request) return json([]);
      state.serviceCalls?.push({ methodname: request.methodname, args: request.args });
      const fail = (errorcode: string) => json([{ error: true, exception: { message: errorcode, errorcode } }]);
      if (!state.user) return fail("servicerequireslogin");
      if (url.searchParams.get("sesskey") !== sesskey) return fail("invalidsesskey");
      const service = state.services?.[request.methodname];
      return service ? json([{ error: false, data: service(request.args) }]) : fail("invalidrecord");
    }
    state.pagesServed?.push(url.pathname);
    const html = (body: string) => route.fulfill({ status: 200, contentType: "text/html", body });
    if (!state.user) return html(moodlePage({ userId: 0, heading: "Log in", sesskey }));
    const heading = url.pathname === "/user/profile.php" ? state.user.fullName : "Dashboard";
    return html(moodlePage({ userId: state.user.id, heading, sesskey }));
  });
}
