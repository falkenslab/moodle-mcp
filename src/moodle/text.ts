import type { Page } from "playwright-core";

/** Moodle formats names for HTML (`format_string`): plain text for the client. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
    const lower = code.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[lower] ?? entity;
  });
}

/**
 * The text of the elements matching `selector` in `page`, one string each: paragraphs, line breaks
 * and list items kept, scripts and styles left out. Runs in the page with no named functions inside
 * (see the conventions on page.evaluate).
 */
export function readTexts(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((selector) => {
    interface Node {
      nodeType: number;
      nodeName: string;
      textContent: string | null;
      childNodes: ArrayLike<Node>;
    }
    const doc = globalThis as unknown as { document: { querySelectorAll(s: string): ArrayLike<Node> } };
    const BLOCKS = new Set(["P", "DIV", "LI", "UL", "OL", "TR", "TABLE", "PRE", "BLOCKQUOTE", "SECTION", "ARTICLE", "H1", "H2", "H3", "H4", "H5", "H6"]);
    return Array.from(doc.document.querySelectorAll(selector)).map((root) => {
      let raw = "";
      const stack: (Node | string)[] = [root];
      while (stack.length > 0) {
        const item = stack.pop()!;
        if (typeof item === "string") raw += item;
        else if (item.nodeType === 3) raw += (item.textContent ?? "").replace(/\s+/g, " ");
        else if (item.nodeType !== 1 || item.nodeName === "SCRIPT" || item.nodeName === "STYLE") continue;
        else if (item.nodeName === "BR") raw += "\n";
        else if (item.nodeName === "PRE") raw += `\n${item.textContent ?? ""}\n`;
        else {
          const isBlock = BLOCKS.has(item.nodeName);
          raw += item.nodeName === "LI" ? "\n- " : isBlock ? "\n" : "";
          // A list item ends where the next one starts: no blank line between items.
          stack.push(isBlock && item.nodeName !== "LI" ? "\n" : "", ...Array.from(item.childNodes).reverse());
        }
      }
      return raw
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n- +/g, "\n- ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    });
  }, selector);
}
