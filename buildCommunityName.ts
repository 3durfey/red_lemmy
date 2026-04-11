/**
 * @fileoverview Helpers for building valid Lemmy community names.
 */

/**
 * Builds a Lemmy-compatible community slug from a subreddit name.
 *
 * @param subredditName Source subreddit name.
 * @returns Sanitized slug (lowercase, underscore-safe, max 20 chars).
 */
export function buildCommunityName(subredditName: string): string {
  const MAX_LEN = 20;
  const clean = subredditName
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return clean.slice(0, MAX_LEN) || "community";
}
