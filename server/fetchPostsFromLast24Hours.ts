/**
 * @fileoverview Helpers for fetching recent Reddit posts in a 24-hour window.
 */

import { fetchPostsSinceUtc } from "./fetchPostsSinceUtc.js";
import { FeedSort, RedditPost, TopWindow } from "./types.js";

/**
 * Fetches subreddit posts created within the last 24 hours.
 *
 * Uses the requested sort mode and a UTC cutoff of now minus 24 hours.
 *
 * @param redditUrl Base subreddit URL.
 * @param sort Feed sort mode (`new` or `top`).
 * @param topWindow Time window used when `sort` is `top`.
 * @returns Posts newer than the last 24 hours.
 */
export async function fetchPostsFromLast24Hours(
  redditUrl: string,
  sort: FeedSort = "new",
  topWindow: TopWindow = "day",
): Promise<RedditPost[]> {
  const cutoffUtc = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  return fetchPostsSinceUtc(redditUrl, cutoffUtc, sort, topWindow);
}
