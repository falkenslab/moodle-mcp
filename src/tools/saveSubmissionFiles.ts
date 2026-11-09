import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { assignmentSubmissions, downloadFile } from "../driver.js";
import { people, personFields, pseudonymizing, shown, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

// Extensions kept in a saved file's neutral name: anything else after a dot could be a surname ("ada.lovelace").
const TEXT = new Set(["txt", "md", "csv", "tsv", "html", "htm", "xml", "json", "yaml", "yml", "ipynb", "py", "java", "js", "ts", "c", "h", "cpp", "cs", "php", "sql", "css", "sh"]);
const OTHER = new Set(["pdf", "doc", "docx", "odt", "rtf", "ppt", "pptx", "odp", "xls", "xlsx", "ods", "zip", "rar", "7z", "tar", "gz", "png", "jpg", "jpeg", "gif", "svg", "webp", "mp3", "mp4", "webm"]);

const outputSchema = {
  assignment: z.object({ id: z.number().int() }),
  submissions: z.array(
    z.object({
      ...personFields,
      files: z.array(
        z.object({
          path: z.string().describe("Where it was saved: a folder per participant, a neutral file name"),
          size: z.number().int(),
          contentType: z.string().optional(),
          textChecked: z.boolean().describe("Whether names were looked for in its text and replaced by aliases: only plain text files, when the server pseudonymizes. A name written inside a PDF, a document or an image isn't hidden"),
        }),
      ),
    }),
  ),
};

/** A saved file's text with known people as aliases, in place; false when it isn't plain UTF-8 text, and is left as it came. */
async function hideNames(...[config, siteUrl, file]: [Parameters<typeof text>[0], string, string]): Promise<boolean> {
  const raw = await readFile(file);
  const content = raw.toString("utf8");
  if (!Buffer.from(content, "utf8").equals(raw)) return false;
  const hidden = await text(config, siteUrl, content);
  if (hidden !== content) await writeFile(file, hidden, "utf8");
  return true;
}

export const registerSaveSubmissionFiles: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "save_submission_files",
    {
      title: "Save an assignment's submitted files",
      description:
        "Save the files participants submitted to a Moodle assignment in a local folder, one folder per participant named after their alias when the server pseudonymizes (else user-<id>), with neutral file names (file-1.pdf), so an agent can read and grade them. Gives only who, where and how big. The original file names aren't given, since they often carry a name. In plain text files, known people's names and contact data are replaced by aliases; a name written inside a PDF, a document or an image is not hidden, and whoever reads the file sees it: say so to the person. Saves on this computer and changes nothing in Moodle. Takes the assignment's id from list_assignments.",
      inputSchema: {
        assignmentId: z.number().int().positive().describe("The assignment's id (its course module id), as list_assignments gives it"),
        destDir: z.string().describe("Absolute local folder to save into; created if missing"),
      },
      outputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ assignmentId, destDir }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = (await assignmentSubmissions(context, siteUrl, assignmentId, { includeContent: true })).filter((s) => s.content?.some((c) => c.files.length > 0));
      const who = await people(config, context, siteUrl, found);
      const submissions = [];
      for (const [i, submission] of found.entries()) {
        const person = who[i]!;
        const folder = path.join(destDir, person.alias ?? `user-${person.userId}`);
        const files = [];
        for (const file of submission.content!.flatMap((c) => c.files)) {
          if (!file.url) continue;
          const saved = await downloadFile(context, siteUrl, file.url, folder);
          const extension = path.extname(saved.name).slice(1).toLowerCase();
          const known = TEXT.has(extension) || OTHER.has(extension);
          const neutral = path.join(folder, `file-${files.length + 1}${known ? `.${extension}` : ""}`);
          await rename(saved.path, neutral);
          const textChecked = pseudonymizing(config) && TEXT.has(extension) && (await hideNames(config, siteUrl, neutral));
          files.push({ path: neutral, size: textChecked ? (await readFile(neutral)).length : saved.size, contentType: saved.contentType, textChecked });
        }
        submissions.push({ ...shown(person), files });
      }
      return reply({ assignment: { id: assignmentId }, submissions });
    },
  );
};
