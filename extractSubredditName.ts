/**
 * @fileoverview Helpers for extracting subreddit names from Reddit URLs.
 */

/**
 * Extracts a subreddit name from a Reddit URL/path.
 *
 * Supports values like:
 * - https://reddit.com/r/horses
 * - https://www.reddit.com/r/horses/comments/...
 * - /r/horses
 * - horses
 *
 * @param redditUrl Reddit URL or path.
 * @returns Subreddit name, or "unknown" if no /r/<name> segment is found.
 */
export function extractSubredditName(redditUrl: string): string {
  const match = redditUrl.match(/\/r\/([^/?#]+)/i);
  if (match?.[1]) {
    return match[1];
  }

  const trimmed = redditUrl.trim();
  return /^[A-Za-z0-9_]+$/.test(trimmed) ? trimmed : "unknown";
}
