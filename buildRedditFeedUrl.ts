/**
 * @fileoverview Helpers for building Reddit subreddit feed URLs.
 */

import { FeedSort, TopWindow } from "./types.js";
import { normalizeRedditSubredditUrl } from "./normalizeRedditUrl.js";

/**
 * Builds a Reddit feed URL with sorting parameters.
 *
 * @param redditUrl Base subreddit URL.
 * @param sort Feed sort mode (`new` or `top`).
 * @param topWindow Time window used when `sort` is `top`.
 * @returns Complete feed URL with query parameters.
 */
export function buildRedditFeedUrl(
  redditUrl: string,
  sort: FeedSort,
  topWindow: TopWindow = "day",
): string {
  // Normalize first so every caller gets a canonical subreddit base URL.
  const url = new URL(normalizeRedditSubredditUrl(redditUrl));
  const path = url.pathname.replace(/\/+$/, "");
  const suffix = sort === "top" ? "/top" : "/new";
  const basePath = path.endsWith(suffix) ? path : `${path}${suffix}`;
  url.pathname = basePath;

  // Reddit listing max page size.
  url.searchParams.set("limit", "100");

  // Top feed requires a time window.
  if (sort === "top") {
    url.searchParams.set("t", topWindow);
  }

  return url.toString();
}
