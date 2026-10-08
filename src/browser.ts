import { mkdir } from "node:fs/promises";
import { chromium, type BrowserContext } from "playwright-core";
import { CHANNELS, type Channel, type Config } from "./config.js";
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
  /** Saves the session cookies of the open context, if any (ADR-007). */
  saveSession(): Promise<void>;
  close(): Promise<void>;
}

/** No installed browser could be launched (ADR-001). */
export class BrowserNotFoundError extends Error {
  override name = "BrowserNotFoundError";
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
): BrowserManager {
  let open: Open | undefined;
  // One operation at a time: two launches on the same profile would fail.
  let queue: Promise<unknown> = Promise.resolve();
  function exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.catch(() => undefined);
    return result;
  }

  async function launchFirstAvailable(headed: boolean): Promise<Open> {
    await mkdir(config.profileDir, { recursive: true });
    const channels = config.channel ? [config.channel] : CHANNELS;
    const missing: string[] = [];
    for (const channel of channels) {
      let context: BrowserContext;
      try {
        // A window keeps its own size; a fixed viewport would leave it half empty.
        context = await launch(config.profileDir, { channel, headless: !headed, ...(headed ? { viewport: null } : {}) });
      } catch (error) {
        const message = (error as Error).message ?? String(error);
        if (!NOT_INSTALLED.test(message)) throw error;
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
      `No browser found (tried ${missing.join(", ")}). Install Microsoft Edge or Google Chrome, or choose another with MOODLE_MCP_CHANNEL.`,
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
        await closeOpen();
        open = await launchFirstAvailable(wantHeaded);
        return open.context;
      });
    },
    openChannel: () => open?.channel,
    saveSession: () =>
      exclusive(async () => {
        if (open) await saveSessionCookies(open.context, config.profileDir);
      }),
    close: () => exclusive(closeOpen),
  };
}
