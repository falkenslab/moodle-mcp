import type { BrowserContext, Page } from "playwright-core";
import { z } from "zod";
import { redactUrl, requireSiteUrl } from "../config.js";
import { NotLoggedInError, openSitePage, pageIsLoggedIn } from "../moodle/session.js";
import type { RegisterTool } from "./types.js";

const DEFAULT_TIMEOUT_SECONDS = 300;
const POLL_MS = 1000;
const PROGRESS_EVERY_MS = 5000;

const inputSchema = {
  timeoutSeconds: z
    .number()
    .int()
    .min(10)
    .max(1800)
    .optional()
    .describe(`How long to wait for the person to log in, in seconds (default ${DEFAULT_TIMEOUT_SECONDS})`),
};

const outputSchema = {
  status: z.enum(["already-logged-in", "logged-in"]),
  userId: z.number().int(),
  fullName: z.string(),
  siteUrl: z.string(),
};

type LoginResult = z.infer<z.ZodObject<typeof outputSchema>>;

export class LoginTimeoutError extends Error {
  override name = "LoginTimeoutError";
}

export class LoginWindowClosedError extends Error {
  override name = "LoginWindowClosedError";
  constructor() {
    super("The login window was closed before the person logged in. Call login again when they are ready.");
  }
}

/** The logged-in user, read from their own profile page (`user/profile.php`). */
async function readOwnProfile(context: BrowserContext, siteUrl: string): Promise<{ userId: number; fullName: string }> {
  const page = await openSitePage(context, siteUrl, "user/profile.php");
  try {
    return await page.evaluate(() => {
      const g = globalThis as unknown as {
        M: { cfg: { userId: number } };
        document: { querySelector(selector: string): { textContent: string | null } | null };
      };
      // The page heading is the user's full name, in any interface language.
      const heading = g.document.querySelector("#page-header h1, .page-header-headings h1, h1");
      return { userId: g.M.cfg.userId, fullName: heading?.textContent?.trim() ?? "" };
    });
  } finally {
    await page.close().catch(() => undefined);
  }
}

/**
 * Waits until `page` shows the site with a user logged in. The person may go through other domains
 * (SSO) on the way; reads fail while a page navigates, and are retried.
 */
export async function waitForLogin(
  page: Page,
  siteUrl: string,
  { timeoutMs, pollMs = POLL_MS, onWait }: { timeoutMs: number; pollMs?: number; onWait?: (elapsedMs: number) => void },
): Promise<void> {
  const start = Date.now();
  for (;;) {
    if (page.isClosed()) throw new LoginWindowClosedError();
    if (await pageIsLoggedIn(page, siteUrl).catch(() => false)) return;
    const elapsed = Date.now() - start;
    if (elapsed >= timeoutMs) {
      throw new LoginTimeoutError(`Nobody logged in within ${Math.round(timeoutMs / 1000)} seconds; the window was closed. Call login again when the person is ready.`);
    }
    onWait?.(elapsed);
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

export const registerLogin: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "login",
    {
      title: "Log in to Moodle",
      description:
        "Make sure there is a Moodle session. If there is one, returns the logged-in user at once. Otherwise opens a browser window at the site's login page and waits until the person logs in there themselves (the server never sees their password), then returns the user. Call it when another tool reports a missing or expired session.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ timeoutSeconds = DEFAULT_TIMEOUT_SECONDS }, extra) => {
      const siteUrl = requireSiteUrl(config);
      const result = (status: LoginResult["status"], user: { userId: number; fullName: string }) => {
        const output: LoginResult = { status, ...user, siteUrl: redactUrl(siteUrl) };
        return { content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }], structuredContent: output };
      };

      try {
        return result("already-logged-in", await readOwnProfile(await browser.context(), siteUrl));
      } catch (error) {
        if (!(error instanceof NotLoggedInError)) throw error;
      }

      const context = await browser.context({ headed: true });
      const page = context.pages()[0] ?? (await context.newPage());
      await page.goto(new URL("login/index.php", siteUrl).href, { waitUntil: "domcontentloaded" });
      await page.bringToFront();

      // Clients that pass a progress token keep waiting while progress arrives.
      const progressToken = extra._meta?.progressToken;
      let lastProgress = 0;
      const onWait = (elapsedMs: number) => {
        if (progressToken === undefined || elapsedMs - lastProgress < PROGRESS_EVERY_MS) return;
        lastProgress = elapsedMs;
        void extra
          .sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: Math.round(elapsedMs / 1000), total: timeoutSeconds, message: "Waiting for the person to log in in the browser window" },
          })
          .catch(() => undefined);
      };

      try {
        await waitForLogin(page, siteUrl, { timeoutMs: timeoutSeconds * 1000, onWait });
      } catch (error) {
        if (error instanceof LoginTimeoutError) await browser.close();
        throw error;
      }

      const user = await readOwnProfile(context, siteUrl);
      await browser.saveSession();
      // Back to the configured mode: the next tool reopens the browser without a window.
      if (!browser.visible()) await browser.close();
      return result("logged-in", user);
    },
  );
};
