/**
 * @fileoverview Helpers for normalizing supported Reddit subreddit inputs.
 */

const REDDIT_HOSTS = new Set(["reddit.com", "www.reddit.com", "old.reddit.com"]);

/**
 * Normalizes subreddit input into a canonical Reddit subreddit URL.
 *
 * Supports plain subreddit names, `/r/<name>` paths, and Reddit subreddit URLs.
 *
 * @param input User-provided subreddit input.
 * @returns Canonical subreddit URL on `https://www.reddit.com`.
 * @throws Error when the input does not identify a subreddit.
 */
export function normalizeRedditSubredditUrl(input: string): string {
  const trimmed = input.trim();
  const pathSubredditMatch = trimmed.match(/^\/?r\/([^/?#]+)/i);

  if (pathSubredditMatch?.[1]) {
    return `https://www.reddit.com/r/${pathSubredditMatch[1]}`;
  }

  if (/^[A-Za-z0-9_]+$/.test(trimmed)) {
    return `https://www.reddit.com/r/${trimmed}`;
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();

    if (!REDDIT_HOSTS.has(hostname)) {
      throw new Error("Only reddit.com subreddit URLs are supported.");
    }
    const subredditMatch = url.pathname.match(/^\/r\/([^/?#]+)/i);
    if (!subredditMatch?.[1]) {
      throw new Error("Input must include a /r/<subreddit> path.");
    }

    return `https://www.reddit.com/r/${subredditMatch[1]}`;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Input must be a subreddit name or Reddit subreddit URL.");
  }
}
