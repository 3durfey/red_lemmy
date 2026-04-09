/**
 * @fileoverview Single-page Reddit feed fetch helper.
 */

import { buildRedditFeedUrl } from "./buildRedditFeedUrl.js";
import { extractPosts } from "./extractPosts.js";
import { fetchReddit } from "./reddit.js";
import { FeedSort, RedditPost, TopWindow } from "./types.js";

/**
 * Fetches a single Reddit listing page and normalizes it into importer posts.
 *
 * @param redditUrl Base subreddit URL.
 * @param sort Feed sort mode (`new` or `top`).
 * @param topWindow Time window used when `sort` is `top`.
 * @returns Normalized posts from one Reddit listing page.
 */
export async function fetchRedditFeedPage(
  redditUrl: string,
  sort: FeedSort,
  topWindow: TopWindow = "day",
): Promise<RedditPost[]> {
  const feedUrl = buildRedditFeedUrl(redditUrl, sort, topWindow);
  const redditData = await fetchReddit(feedUrl);
  return extractPosts(redditData).slice(0, 100);
}
