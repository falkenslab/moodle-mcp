import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { NotLoggedInError } from "../moodle/session.js";
import type { RegisterTool } from "./types.js";

/** A file name from Content-Disposition, else the URL's last segment; never a path. */
export function fileNameFor(url: URL, disposition: string | undefined): string {
  const encoded = disposition && /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plain = disposition && /filename="?([^";]+)"?/i.exec(disposition)?.[1];
  const raw = encoded ? decodeURIComponent(encoded) : (plain ?? decodeURIComponent(url.pathname.split("/").pop() || "download"));
  // The last segment of whatever path it names, then without characters a file name can't have.
  const name = (raw.split(/[\\/]/).pop() ?? "").replace(/[:*?"<>|]+/g, "_").trim();
  return name === "" || name === "." || name === ".." ? "download" : name;
}

/** `dir/name`, or `dir/name (2).ext`… when it exists: a download never overwrites. */
async function freePath(dir: string, name: string): Promise<string> {
  const { name: stem, ext } = path.parse(name);
  for (let n = 1; ; n++) {
    const candidate = path.join(dir, n === 1 ? name : `${stem} (${n})${ext}`);
    if (!(await access(candidate).then(() => true, () => false))) return candidate;
  }
}

export const registerDownloadFile: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "download_file",
    {
      title: "Download a file from Moodle",
      description:
        "Save a file of the Moodle site to a local folder, with the person's session: a resource's or folder's file (get_activity_content), an assignment's brief file or submitted file (get_assignment, get_submissions), a forum attachment (get_discussion). Only URLs of the configured site's host (its media too: videos it serves outside Moodle); external links (YouTube…) are for other tools. Never overwrites: an existing name gets a number. Returns where it was saved.",
      inputSchema: {
        url: z.string().url().describe("The file's URL on the site, as the other tools give it (…/pluginfile.php/…)"),
        destDir: z.string().describe("Absolute local folder to save into; created if missing"),
      },
      outputSchema: { path: z.string(), name: z.string(), size: z.number().int(), contentType: z.string().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ url, destDir }) => {
      const siteUrl = requireSiteUrl(config);
      const target = new URL(url);
      // The session's cookies go only to the site's origin: its own files, and media the same host serves
      // outside Moodle's path (a video library next to the campus).
      if (target.origin !== new URL(siteUrl).origin) throw new Error(`Only files of ${new URL(siteUrl).origin} can be downloaded with the session; ${target.origin} isn't the site. Give that link to the person or another tool.`);
      if (!path.isAbsolute(destDir)) throw new Error(`Give destDir as an absolute path: "${destDir}".`);
      // The browser context's request API carries its cookies without opening a tab.
      const response = await (await browser.context()).request.get(target.href, { maxRedirects: 5 });
      const contentType = response.headers()["content-type"]?.split(";")[0]?.trim();
      // A file the session can't reach comes back as the login page.
      if (contentType === "text/html" && new URL(response.url()).pathname.includes("/login/")) throw new NotLoggedInError();
      if (!response.ok()) throw new Error(`Moodle answered ${response.status()} for ${target.pathname}: the file doesn't exist or you can't see it.`);
      await mkdir(destDir, { recursive: true });
      const name = fileNameFor(target, response.headers()["content-disposition"]);
      const body = await response.body();
      const saved = await freePath(destDir, name);
      await writeFile(saved, body);
      const output = { path: saved, name: path.basename(saved), size: body.length, contentType };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
