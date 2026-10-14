// Several Moodle sites, one active (ADR-021): the sites added at run time, saved in the data folder,
// and switching between them. Every tool works on the active site through `moodleUrl` and
// `profileDir`, as it did with one site.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BrowserManager } from "@falkenslab/moodle-driver";
import { ConfigError, parseSiteName, siteNameOf, siteProfileDir, type Config, type Site } from "./config.js";

const SITES_FILE = "sites.json";

/** The sites added at run time in an earlier session, after the configured ones; a configured name or URL wins. */
export function loadRuntimeSites(config: Config): void {
  let saved: unknown;
  try {
    saved = JSON.parse(readFileSync(path.join(config.dataDir, SITES_FILE), "utf8"));
  } catch {
    return;
  }
  if (!Array.isArray(saved)) return;
  for (const entry of saved as Partial<Site>[]) {
    if (typeof entry?.name !== "string" || typeof entry.url !== "string" || typeof entry.profileDir !== "string") continue;
    if (config.sites.some((site) => site.name === entry.name || site.url === entry.url)) continue;
    config.sites.push({ name: entry.name, url: entry.url, profileDir: entry.profileDir, origin: "run-time" });
  }
  // With no site configured, the first saved one is active, as configure left it.
  if (config.activeSite === undefined && config.sites[0]) activate(config, config.sites[0]);
}

function saveRuntimeSites(config: Config): void {
  mkdirSync(config.dataDir, { recursive: true });
  const runTime = config.sites.filter((site) => site.origin === "run-time").map(({ name, url, profileDir }) => ({ name, url, profileDir }));
  writeFileSync(path.join(config.dataDir, SITES_FILE), `${JSON.stringify(runTime, null, 2)}\n`, { mode: 0o600 });
}

/**
 * Adds a site at run time and saves it. Its URL must already be the site's base URL (checked by the
 * caller). The first site of a server with none keeps the profile in use, so today's session stays;
 * any other gets its own in the data folder.
 */
export function addSite(config: Config, url: string, name?: string): Site {
  const siteName = name !== undefined ? parseSiteName(name) : uniqueName(config, siteNameOf(url));
  // The same site again is another account on it, which needs a name of its own.
  const known = config.sites.find((site) => site.url === url);
  if (known && name === undefined) throw new ConfigError(`That site is already known, as "${known.name}": to add another account on it, give this one a name.`);
  if (config.sites.some((site) => site.name === siteName)) throw new ConfigError(`A site is already named "${siteName}": choose another name.`);
  const site: Site = { name: siteName, url, profileDir: config.sites.length === 0 ? config.profileDir : siteProfileDir(config.dataDir, siteName), origin: "run-time" };
  config.sites.push(site);
  saveRuntimeSites(config);
  return site;
}

function uniqueName(config: Config, base: string): string {
  let name = base;
  for (let n = 2; config.sites.some((site) => site.name === name); n++) name = `${base}-${n}`;
  return name;
}

/** The site with this name, or an error naming the known ones. */
export function findSite(config: Config, name: string): Site {
  const site = config.sites.find((s) => s.name === name);
  if (!site) throw new ConfigError(config.sites.length ? `No site is named "${name}": the known ones are ${config.sites.map((s) => s.name).join(", ")}.` : `No site is named "${name}": this server knows no site yet (add_site).`);
  return site;
}

function activate(config: Config, site: Site): void {
  config.activeSite = site.name;
  config.moodleUrl = site.url;
  config.profileDir = site.profileDir;
}

/**
 * Makes a site the active one: the browser of the one before closes (its session stays in its
 * profile) and the next tool opens the new one's. In memory only: a restart starts on the first site.
 */
export async function useSite(config: Config, browser: BrowserManager, name: string): Promise<Site> {
  const site = findSite(config, name);
  if (config.activeSite === site.name && config.moodleUrl === site.url && config.profileDir === site.profileDir) return site;
  if (config.profileDir !== site.profileDir) await browser.close();
  activate(config, site);
  config.sources.moodleUrl = "configure";
  config.sources.profileDir = "configure";
  return site;
}

/** Forgets a site added at run time and deletes its profile, never the active one or a configured one. */
export function removeSite(config: Config, name: string): Site {
  const site = findSite(config, name);
  if (site.origin === "configuration") throw new ConfigError(`"${name}" comes from the person's configuration (MOODLE_URL or MOODLE_MCP_SITES): only they can remove it, there.`);
  if (config.activeSite === name) throw new ConfigError(`"${name}" is the active site: switch to another with use_site first.`);
  config.sites = config.sites.filter((s) => s !== site);
  saveRuntimeSites(config);
  // Its own folder only: a profile shared with another site, or outside the data folder, stays.
  const own = siteProfileDir(config.dataDir, name);
  if (site.profileDir === own && !config.sites.some((s) => s.profileDir === own)) rmSync(path.dirname(own), { recursive: true, force: true });
  return site;
}
