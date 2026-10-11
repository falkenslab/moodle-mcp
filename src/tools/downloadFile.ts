import { z } from "zod";
import { downloadFile } from "@falkenslab/moodle-driver";
import { onSite } from "./reply.js";
import { OutOfScopeError, holdsOthersFiles, othersFilesAllowed, studentDataAllowed } from "./scopes.js";
import type { RegisterTool } from "./types.js";

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
      // Without names in clear, only what teachers made: never a submission, an attachment or someone's draft (ADR-015, ADR-016).
      if (!othersFilesAllowed(config) && holdsOthersFiles(new URL(url))) {
        throw new OutOfScopeError(
          studentDataAllowed(config)
            ? "That file belongs to someone's work (a submission, a forum attachment, a user's files): this server pseudonymizes students' data, and a file's content can't be."
            : "That file belongs to someone's work (a submission, a forum attachment, a user's files): this server is configured without students' data.",
        );
      }
      const output = await downloadFile(...(await onSite(config, browser)), url, destDir);
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: { ...output } };
    },
  );
};
