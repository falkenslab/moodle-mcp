import type { BrowserManager } from "@falkenslab/moodle-driver";
import type { BrowserContext } from "playwright-core";
import { requireSiteUrl, type Config } from "../config.js";
import { resolveActiveSite } from "../sites.js";

/**
 * A tool's result: `output` as structured content (checked against the tool's output schema) and the
 * same as JSON text, for clients that ignore structured content.
 */
export function reply(output: object) {
  return { content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }], structuredContent: output as Record<string, unknown> };
}

/**
 * The browser context and the site, in that order for a driver call, but the site checked first: a
 * server without a site says to configure it before opening any browser.
 */
export async function onSite(config: Config, browser: BrowserManager): Promise<[BrowserContext, string]> {
  requireSiteUrl(config);
  await resolveActiveSite(config);
  const siteUrl = requireSiteUrl(config);
  return [await browser.context(), siteUrl];
}
