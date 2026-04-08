/**
 * @fileoverview Helpers for creating safe Lemmy post titles.
 */

const LEMMY_MAX_TITLE_LEN = 200;

/**
 * Builds a safe Lemmy post title from Reddit title + optional author.
 * Enforces single-line text, strips control characters, and caps length.
 *
 * @param title Original Reddit post title.
 * @param author Optional Reddit username for attribution.
 * @returns Title text compatible with Lemmy post validation rules.
 */
export function buildLemmyPostTitle(title: string, author?: string): string {
  const base = author ? `${title} - posted by u/${author}` : title;

  const normalized = base
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const safe = normalized || "Untitled post";
  return safe.slice(0, LEMMY_MAX_TITLE_LEN);
}
