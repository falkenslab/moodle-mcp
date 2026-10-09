import { mkdir } from "node:fs/promises";
import { chromium, type BrowserContext } from "playwright-core";
import { installChromium, type InstallChromium } from "./chromiumInstaller.js";
import { SYSTEM_CHANNELS, type Channel, type Config } from "./config.js";
import { restoreSessionCookies, saveSessionCookies } from "./sessionCookies.js";

type LaunchPersistentContext = typeof chromium.launchPersistentContext;

export interface ContextOptions {
  /** A visible window, whatever the configuration says (the login tool). */
  headed?: boolean;
}

/** The browser's single persistent context, opened on first use (ADR-002). */
export interface BrowserManager {
  /**
   * The open context, launching it if needed. A headed request relaunches a headless context with
   * a window; a headless request reuses a headed one rather than closing a window the person may be using.
   */
  context(options?: ContextOptions): Promise<BrowserContext>;
  /** The channel of the open context, or `undefined` while none is open. */
  openChannel(): Channel | undefined;
  /** Whether Chromium is being downloaded, or the last download failed (ADR-001). */
  chromiumDownload(): "downloading" | "failed" | undefined;
  /** Saves the session cookies of the open context, if any (ADR-007). */
  saveSession(): Promise<void>;
  close(): Promise<void>;
}

/** No installed browser could be launched, and Chromium can't be downloaded (ADR-001). */
export class BrowserNotFoundError extends Error {
  override name = "BrowserNotFoundError";
}

/** No browser yet: Chromium is downloading in the background, and the call should be retried later. */
export class BrowserDownloadingError extends Error {
  override name = "BrowserDownloadingError";
}

/** A window was asked for where there's no screen to show it (a container, a server). */
export class NoDisplayError extends Error {
  override name = "NoDisplayError";
}

/**
 * Whether a window can be shown. On Linux it needs an X or Wayland display; without one (Docker, a
 * server) the server refuses rather than trying, so it never reaches a display it wasn't given.
 */
export function canShowWindow(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): boolean {
  return platform !== "linux" || Boolean(env.DISPLAY || env.WAYLAND_DISPLAY);
}

// Playwright's message when a channel isn't installed: "Chromium distribution 'msedge' is not found",
// with " at <path>" only when it knows where to look (playwright-core 1.64).
const NOT_INSTALLED = /distribution '[^']+' is not (found|supported)|Executable doesn't exist/i;

// Moodle pages can take long, above all the first ones after the site starts.
const NAVIGATION_TIMEOUT_MS = 60_000;

interface Open {
  context: BrowserContext;
  channel: Channel;
  headed: boolean;
}

export function createBrowserManager(
  config: Config,
  launch: LaunchPersistentContext = chromium.launchPersistentContext.bind(chromium),
  install: InstallChromium = installChromium,
  windowsPossible: () => boolean = canShowWindow,
): BrowserManager {
  let open: Open | undefined;
  // The download runs in the background, outside the queue: it takes minutes, longer than some
  // clients wait for a tool call, so calls meanwhile answer at once that it's downloading.
  let download: Promise<void> | undefined;
  let downloadFailure: string | undefined;

  function startDownload(): BrowserDownloadingError {
    const retry = downloadFailure ? ` The previous download failed (${downloadFailure}); trying again.` : "";
    downloadFailure = undefined;
    download ??= install().then(
      () => {
        download = undefined;
      },
      (error: unknown) => {
        download = undefined;
        downloadFailure = (error as Error).message ?? String(error);
      },
    );
    return downloading(retry);
  }

  function downloading(extra = ""): BrowserDownloadingError {
    return new BrowserDownloadingError(
      `${config.channel === "chromium" ? "Chromium isn't downloaded yet" : "Neither Microsoft Edge nor Google Chrome is available"}, so the server is downloading it (about 180 MB, into PLAYWRIGHT_BROWSERS_PATH or the user's ms-playwright cache).${extra} Tell the person, and try again in a minute or two.`,
    );
  }
  // One operation at a time: two launches on the same profile would fail.
  let queue: Promise<unknown> = Promise.resolve();
  function exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.catch(() => undefined);
    return result;
  }

  async function launchFirstAvailable(headed: boolean): Promise<Open> {
    await mkdir(config.profileDir, { recursive: true });
    const channels: Channel[] = config.channel ? [config.channel] : [...SYSTEM_CHANNELS, ...(config.downloadBrowser ? (["chromium"] as const) : [])];
    const missing: string[] = [];
    for (const channel of channels) {
      if (channel === "chromium" && download) throw downloading();
      let context: BrowserContext;
      try {
        // A window keeps its own size; a fixed viewport would leave it half empty.
        context = await launch(config.profileDir, { channel, headless: !headed, ...(headed ? { viewport: null } : {}) });
      } catch (error) {
        const message = (error as Error).message ?? String(error);
        if (!NOT_INSTALLED.test(message)) throw error;
        if (channel === "chromium" && config.downloadBrowser) throw startDownload();
        missing.push(channel);
        continue;
      }
      context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
      await restoreSessionCookies(context, config.profileDir);
      const opened: Open = { context, channel, headed };
      // The person may close the window: the next call opens it again.
      context.on("close", () => {
        if (open === opened) open = undefined;
      });
      return opened;
    }
    throw new BrowserNotFoundError(
      `No browser found (tried ${missing.join(", ")}). Install Microsoft Edge or Google Chrome${config.downloadBrowser ? "" : ", or let the server download Chromium (MOODLE_MCP_DOWNLOAD_BROWSER=true)"}, or choose another with MOODLE_MCP_CHANNEL.`,
    );
  }

  async function closeOpen(): Promise<void> {
    const current = open;
    open = undefined;
    if (!current) return;
    await saveSessionCookies(current.context, config.profileDir).catch(() => undefined);
    await current.context.close().catch(() => undefined);
  }

  return {
    context({ headed = false } = {}) {
      return exclusive(async () => {
        const wantHeaded = headed || !config.headless;
        if (open && (open.headed || !wantHeaded)) return open.context;
        if (wantHeaded && !windowsPossible()) {
          throw new NoDisplayError(
            `There's no screen to show a browser window here (no DISPLAY or WAYLAND_DISPLAY), so ${headed ? "logging in by hand isn't possible" : "a headed browser can't open"}. Run the server headless (MOODLE_MCP_HEADLESS=true) with a profile already logged in, or where there's a screen.`,
          );
        }
        await closeOpen();
        open = await launchFirstAvailable(wantHeaded);
        return open.context;
      });
    },
    openChannel: () => open?.channel,
    chromiumDownload: () => (download ? "downloading" : downloadFailure ? "failed" : undefined),
    saveSession: () =>
      exclusive(async () => {
        if (open) await saveSessionCookies(open.context, config.profileDir);
      }),
    close: () => exclusive(closeOpen),
  };
}
