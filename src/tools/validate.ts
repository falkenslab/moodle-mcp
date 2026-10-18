// validate_gift and validate_html: content checked before it's sent to Moodle, without Moodle.
import { readFileSync } from "node:fs";
import { z } from "zod";
import { validateGift, validateHtml } from "../validation.js";
import { reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const problem = z.object({ line: z.number().int(), message: z.string() });
const checks = { readOnlyHint: true, openWorldHint: false } as const;

/** The text given, or the file's. */
function source({ text, file }: { text?: string; file?: string }): string {
  if ((text === undefined) === (file === undefined)) throw new Error("Give the content either as text or as a file, one of them.");
  return text ?? readFileSync(file!, "utf8");
}

export const registerValidateGift: RegisterTool = (server) => {
  server.registerTool(
    "validate_gift",
    {
      title: "Check GIFT questions before importing them",
      description:
        "Check questions in GIFT before import_questions, without Moodle: each question split at blank lines as Moodle's importer does, with its type in Moodle's names, title, text and answers, and each problem with its line (a question Moodle can't read, a weight it doesn't take, a multiple choice with no right answer, a matching question with fewer than two pairs); ordering questions in their own GIFT ({>…}) too, as Moodle exports them. Fix what it reports and check again; valid means Moodle should import every question.",
      inputSchema: { text: z.string().min(1).optional().describe("The questions in GIFT"), file: z.string().optional().describe("Or an absolute path to a local GIFT file") },
      outputSchema: {
        valid: z.boolean(),
        count: z.number().int().describe("Questions found, categories left out"),
        questions: z.array(
          z.object({
            line: z.number().int(),
            type: z.string().describe("multichoice, truefalse, shortanswer, numerical, match, essay, description, or category for a $CATEGORY"),
            title: z.string().optional(),
            text: z.string().optional(),
            answers: z.array(z.object({ text: z.string(), weight: z.number().optional().describe("Its weight, in percent"), correct: z.boolean().optional(), feedback: z.string().optional() })).optional(),
          }),
        ),
        problems: z.array(problem),
      },
      annotations: checks,
    },
    async (input) => {
      const result = validateGift(source(input));
      return reply({ valid: result.problems.length === 0, count: result.questions.filter((q) => q.type !== "category").length, ...result });
    },
  );
};

export const registerValidateHtml: RegisterTool = (server) => {
  server.registerTool(
    "validate_html",
    {
      title: "Check HTML before sending it to Moodle",
      description:
        "Check HTML for a page, a label, a description or a post before sending it, without Moodle, and approximately: only Moodle knows exactly what its cleaning keeps. Reports, with their lines, parse errors and tags left open, what Moodle's cleaning removes (scripts, styles, frames, forms, event attributes such as onclick, javascript: links), files the HTML names that are neither URLs nor in embed, and embed files that don't exist or the HTML doesn't name. Give embed as you would to the content tool.",
      inputSchema: {
        text: z.string().min(1).optional().describe("The HTML"),
        file: z.string().optional().describe("Or an absolute path to a local HTML file"),
        embed: z.array(z.string()).optional().describe("The local files you'll embed, as the content tools take them"),
      },
      outputSchema: { valid: z.boolean(), problems: z.array(problem), images: z.array(z.string()).describe("The images the HTML names by file name, which embed must give") },
      annotations: checks,
    },
    async ({ embed, ...input }) => {
      const result = validateHtml(source(input), embed);
      return reply({ valid: result.problems.length === 0, ...result });
    },
  );
};
