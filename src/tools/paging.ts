// Long lists a page at a time (conventions): limit and offset in, more out, from the driver's ListPage.
import { z } from "zod";

/** A list tool's paging inputs: how many of its items, by default and at most, and where to start. */
export function pageInputs(items: string, byDefault: number, max: number, order = "") {
  return {
    limit: z.number().int().positive().max(max).optional().describe(`How many ${items} (${byDefault} by default, up to ${max})`),
    offset: z.number().int().min(0).optional().describe(`How many ${items} to skip first${order} (0 by default)`),
  };
}

/** Whether a page has others after it. */
export const more = z.boolean().describe("There are more after this page: ask again with offset moved by limit");

/** What a list tool's description says about its paging. */
export const pagedText = (items: string, byDefault: number) => `A page at a time: limit ${items} (${byDefault} by default) after skipping offset; more says whether there are others.`;
