import { mkdir } from "node:fs/promises";
import { chromium, type BrowserContext } from "playwright-core";
import { CHANNELS, type Channel, type Config } from "./config.js";

type LaunchPersistentContext = typeof chromium.launchPersistentContext;

/** The browser's single persistent context, opened on first use (ADR-002). */
export interface BrowserManager {
  /** The open context, launching it if needed. Concurrent callers share one launch. */
  context(): Promise<BrowserContext>;
  /** The channel of the open context, or `undefined` while none is open. */
  openChannel(): Channel | undefined;
  close(): Promise<void>;
}

/** No installed browser could be launched (ADR-001). */
export class BrowserNotFoundError extends Error {
  override name = "BrowserNotFoundError";
}

// Playwright's message when a channel isn't installed: "Chromium distribution 'msedge' is not found",
// with " at <path>" only when it knows where to look (playwright-core 1.64).
const NOT_INSTALLED = /distribution '[^']+' is not (found|supported)|Executable doesn't exist/i;

export function createBrowserManager(
  config: Config,
  launch: LaunchPersistentContext = chromium.launchPersistentContext.bind(chromium),
): BrowserManager {
  let opening: Promise<{ context: BrowserContext; channel: Channel }> | undefined;
  let open: { context: BrowserContext; channel: Channel } | undefined;

  async function launchFirstAvailable(): Promise<{ context: BrowserContext; channel: Channel }> {
    await mkdir(config.profileDir, { recursive: true });
    const channels = config.channel ? [config.channel] : CHANNELS;
    const missing: string[] = [];
    for (const channel of channels) {
      try {
        const context = await launch(config.profileDir, { channel, headless: config.headless });
        return { context, channel };
      } catch (error) {
        const message = (error as Error).message ?? String(error);
        if (!NOT_INSTALLED.test(message)) throw error;
        missing.push(channel);
      }
    }
    throw new BrowserNotFoundError(
      `No browser found (tried ${missing.join(", ")}). Install Microsoft Edge or Google Chrome, or choose another with MOODLE_MCP_CHANNEL.`,
    );
  }

  return {
    context() {
      opening ??= launchFirstAvailable().then(
        (result) => {
          open = result;
          // The person may close the window: the next call opens it again.
          result.context.on("close", () => {
            open = undefined;
            opening = undefined;
          });
          return result;
        },
        (error: unknown) => {
          opening = undefined;
          throw error;
        },
      );
      return opening.then((result) => result.context);
    },
    openChannel: () => open?.channel,
    async close() {
      const current = opening;
      opening = undefined;
      open = undefined;
      if (current) await current.then((result) => result.context.close()).catch(() => undefined);
    },
  };
}
