import { FeedSort, TopWindow } from "./types.js";
import { normalizeRedditSubredditUrl } from "./normalizeRedditUrl.js";

/**
 * Builds a Reddit feed URL with sorting and pagination parameters.
 *
 * @param redditUrl Base subreddit URL.
 * @param sort Feed sort mode (`new` or `top`).
 * @param after Pagination token from previous page.
 * @param topWindow Time window used when `sort` is `top`.
 * @returns Complete feed URL with query parameters.
 *
 * @example
 * // Fetch second page of results
 * buildRedditFeedUrl("https://reddit.com/r/horses", "new", "t3_abc123")
 * // Returns: https://reddit.com/r/horses/new?limit=100&after=t3_abc123
 */
export function buildRedditFeedUrl(
  redditUrl: string,
  sort: FeedSort,
  after?: string,
  topWindow: TopWindow = "day",
): string {
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

  // Include or clear pagination cursor.
  if (after) {
    url.searchParams.set("after", after);
  } else {
    url.searchParams.delete("after");
  }

  return url.toString();
}
