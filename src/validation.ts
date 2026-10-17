// GIFT and HTML checked before they reach Moodle, without Moodle: validate_gift and validate_html.
// GIFT is parsed with gift-pegjs (MIT) and Moodle's own refusals added; HTML is checked approximately,
// since only Moodle knows exactly what its cleaning (HTMLPurifier) removes.
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseGift, type GIFTQuestion } from "gift-pegjs";
import { parseFragment, type DefaultTreeAdapterMap } from "parse5";

export interface Problem {
  line: number;
  message: string;
}

export interface GiftQuestion {
  /** Where it starts in the text. */
  line: number;
  /** Moodle's name for its type, or "category" for a $CATEGORY line. */
  type: string;
  title?: string;
  text?: string;
  answers?: { text: string; weight?: number; correct?: boolean; feedback?: string }[];
}

/** Moodle's question types by gift-pegjs's names. */
const TYPES: Record<string, string> = { MC: "multichoice", TF: "truefalse", Short: "shortanswer", Numerical: "numerical", Matching: "match", Essay: "essay", Description: "description", Category: "category" };

/** The percentages Moodle takes as an answer's weight (question_bank::fraction_options_full), and their negatives. */
const WEIGHTS = [100, 90, 83.33333, 80, 75, 70, 66.66667, 60, 50, 40, 33.33333, 30, 25, 20, 16.66667, 14.28571, 12.5, 11.11111, 10, 5, 0];
const validWeight = (weight: number) => WEIGHTS.some((w) => Math.abs(Math.abs(weight) - w) < 0.01);

/**
 * Escapes `=`, `~` and `#` outside the answers' braces: Moodle's importer reads the question's text
 * up to its first `{` and takes them there as they are, where gift-pegjs refuses them.
 */
function escapeOutsideBraces(block: string): string {
  let out = "";
  let depth = 0;
  for (let i = 0; i < block.length; i++) {
    const c = block[i]!;
    if (c === "\\") {
      out += c + (block[i + 1] ?? "");
      i++;
      continue;
    }
    if (c === "{") depth++;
    if (c === "}") depth = Math.max(0, depth - 1);
    out += depth === 0 && "=~#".includes(c) && !(c === "=" && block.startsWith("::", i + 1)) ? `\\${c}` : c;
  }
  return out;
}

const plain = (value: { text: string } | null | undefined) => value?.text.trim() || undefined;

/** An answer as text: a text answer's, or a number as GIFT writes it (4, 4:0.5, 1..5). */
function answerText(value: unknown): string {
  const v = value as { text?: string; type?: string; number?: number; range?: number; numberLow?: number; numberHigh?: number };
  if (typeof v?.text === "string") return v.text.trim();
  if (v?.type === "range") return `${v.number}:${v.range}`;
  if (v?.type === "high-low") return `${v.numberLow}..${v.numberHigh}`;
  if (v?.number !== undefined) return String(v.number);
  return JSON.stringify(value);
}

function describe(question: GIFTQuestion, line: number): { question: GiftQuestion; problems: Problem[] } {
  const problems: Problem[] = [];
  const base: GiftQuestion = { line, type: TYPES[question.type] ?? question.type };
  if (question.type === "Category") return { question: { ...base, title: question.title }, problems };
  const shown: GiftQuestion = { ...base, ...(question.title && { title: question.title }), ...(question.stem && { text: question.stem.text.trim() }) };
  if (question.type === "MC" || question.type === "Short" || question.type === "Numerical") {
    type Choice = { isCorrect: boolean; weight: number | null; text: unknown; feedback: { text: string } | null };
    // A numerical question with one answer and no = gives the number itself, not a list of choices.
    const given = question.choices as unknown as Choice[] | Record<string, unknown>;
    const choices: Choice[] = Array.isArray(given) ? given : [{ isCorrect: true, weight: null, text: given, feedback: null }];
    shown.answers = choices.map((c) => ({
      text: answerText(c.text),
      ...(c.weight !== null && { weight: c.weight }),
      ...(c.isCorrect && { correct: true }),
      ...(plain(c.feedback) && { feedback: plain(c.feedback) }),
    }));
    for (const c of choices) if (c.weight !== null && !validWeight(c.weight)) problems.push({ line, message: `The weight ${c.weight}% isn't one Moodle takes (100, 90, 83.33333, 80, 75, 70, 66.66667, 60, 50, 40, 33.33333, 30, 25, 20, 16.66667, 14.28571, 12.5, 11.11111, 10, 5 or 0, or their negatives): Moodle refuses the question.` });
    const right = choices.some((c) => c.isCorrect || (c.weight ?? 0) >= 100) || choices.filter((c) => (c.weight ?? 0) > 0).reduce((sum, c) => sum + c.weight!, 0) >= 99.9;
    if (question.type === "MC" && !right) problems.push({ line, message: "No answer is right: give one with = or weights that add up to 100%." });
    if (choices.length === 0) problems.push({ line, message: "It has no answer." });
  }
  if (question.type === "Matching") {
    shown.answers = question.matchPairs.map((p) => ({ text: `${p.subquestion.text.trim()} -> ${p.subanswer.trim()}` }));
    if (question.matchPairs.length < 2) problems.push({ line, message: "A matching question needs two pairs at least." });
  }
  if (question.type === "TF") shown.answers = [{ text: question.isTrue ? "true" : "false", correct: true }];
  return { question: shown, problems };
}

/**
 * GIFT as Moodle's importer reads it: split at blank lines, each block a question (or a $CATEGORY),
 * parsed alone so that every problem gets its line and the good questions still show.
 */
export function validateGift(text: string): { questions: GiftQuestion[]; problems: Problem[] } {
  const questions: GiftQuestion[] = [];
  const problems: Problem[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let start = 0;
  const flush = (end: number) => {
    const blockLines = lines.slice(start, end);
    const firstLine = start + 1 + blockLines.findIndex((l) => l.trim() && !l.trim().startsWith("//"));
    const block = blockLines.filter((l) => !l.trim().startsWith("//")).join("\n").trim();
    start = end + 1;
    if (!block) return;
    try {
      for (const parsed of parseGift(`${escapeOutsideBraces(block)}\n`)) {
        const { question, problems: found } = describe(parsed, firstLine);
        questions.push(question);
        problems.push(...found);
      }
    } catch (error) {
      // At the question's first line: the parser's own place is often its end, where it gave up.
      problems.push({ line: firstLine, message: `Moodle won't read this question: ${(error as Error).message}` });
    }
  };
  lines.forEach((line, i) => {
    if (!line.trim()) flush(i);
  });
  flush(lines.length);
  if (questions.filter((q) => q.type !== "category").length === 0 && problems.length === 0) problems.push({ line: 1, message: "No question found." });
  return { questions, problems };
}

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

/** Elements Moodle's cleaning takes out of the text of someone without trusted text. */
const REMOVED = new Set(["script", "style", "iframe", "frame", "frameset", "object", "embed", "applet", "form", "input", "button", "select", "textarea", "link", "meta", "base"]);

/**
 * HTML checked as Moodle will treat it, approximately: parse errors, what its cleaning removes
 * (scripts, frames, forms, event attributes, `javascript:` links), and the local files `embed` gives
 * against what the HTML names.
 */
export function validateHtml(html: string, embed: string[] = []): { problems: Problem[]; images: string[] } {
  const problems: Problem[] = [];
  const named = new Set<string>();
  const images: string[] = [];
  const tree = parseFragment(html, {
    sourceCodeLocationInfo: true,
    onParseError: (error) => problems.push({ line: error.startLine, message: `HTML: ${error.code.replaceAll("-", " ")}.` }),
  });
  // Tags left open: the parser closes them silently, Moodle's cleaning too, maybe not where meant.
  const visit = (node: Node) => {
    if (!("tagName" in node)) {
      if ("childNodes" in node) node.childNodes.forEach(visit);
      return;
    }
    const element = node as Element;
    const line = element.sourceCodeLocation?.startLine ?? 1;
    if (REMOVED.has(element.tagName)) problems.push({ line, message: `<${element.tagName}> is removed by Moodle's cleaning.` });
    if (element.sourceCodeLocation && !element.sourceCodeLocation.endTag && !VOID.has(element.tagName) && !OPTIONAL_END.has(element.tagName)) problems.push({ line, message: `<${element.tagName}> isn't closed.` });
    for (const attribute of element.attrs) {
      if (/^on/i.test(attribute.name)) problems.push({ line, message: `The ${attribute.name} attribute of <${element.tagName}> is removed by Moodle's cleaning.` });
      if (/^\s*javascript:/i.test(attribute.value)) problems.push({ line, message: `A javascript: link in <${element.tagName}> is removed by Moodle's cleaning.` });
    }
    const src = element.attrs.find((a) => a.name === "src" || (a.name === "href" && element.tagName === "a"))?.value;
    if (src && !/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(src)) {
      named.add(src);
      if (element.tagName === "img") images.push(src);
    }
    element.childNodes.forEach(visit);
    if (element.tagName === "template" && "content" in element) visit((element as unknown as { content: Node }).content);
  };
  visit(tree as unknown as Node);
  const embedded = new Map(embed.map((file) => [path.basename(file), file]));
  for (const name of named) if (!embedded.has(name)) problems.push({ line: 1, message: `"${name}" isn't a URL nor a file in embed: Moodle would show it broken.` });
  for (const [name, file] of embedded) {
    if (!existsSync(file)) problems.push({ line: 1, message: `The embed file ${file} doesn't exist.` });
    if (!named.has(name)) problems.push({ line: 1, message: `The embed file ${name} isn't named in the HTML (<img src="${name}">): it would be uploaded and not shown.` });
  }
  // The parser may rebuild a formatting element it closed (<b> across a block), reported once.
  const unique = [...new Map(problems.map((p) => [`${p.line} ${p.message}`, p])).values()];
  return { problems: unique.sort((a, b) => a.line - b.line), images };
}

/** Elements whose end tag HTML lets out. */
const OPTIONAL_END = new Set(["p", "li", "dt", "dd", "td", "th", "tr", "thead", "tbody", "tfoot", "option", "optgroup", "colgroup", "caption", "rt", "rp", "html", "head", "body"]);

/** Elements that have no end tag. */
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
