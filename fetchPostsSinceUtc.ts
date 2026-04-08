/**
 * @fileoverview Paginated Reddit feed fetch helpers with UTC cutoff filtering.
 */

import { fetchReddit } from "./reddit.js";
import { buildRedditFeedUrl } from "./buildRedditFeedUrl.js";
import { extractPosts } from "./extractPosts.js";
import { FeedSort, RedditPost, TopWindow } from "./types.js";

/**
 * Fetches Reddit posts newer than a UTC cutoff timestamp.
 *
 * Uses paginated Reddit listing requests (up to 10 pages, 100 posts each),
 * keeps only posts with `createdUtc > cutoffUtc`, and returns them in
 * chronological order (oldest first).
 *
 * @param redditUrl Base subreddit URL.
 * @param cutoffUtc Minimum post timestamp (Unix seconds, UTC).
 * @param sort Feed sort mode (`new` or `top`).
 * @param topWindow Time window for `top` sort.
 * @returns Filtered posts newer than `cutoffUtc`.
 */
export async function fetchPostsSinceUtc(
  redditUrl: string,
  cutoffUtc: number,
  sort: FeedSort = "new",
  topWindow: TopWindow = "day",
): Promise<RedditPost[]> {
  const collected: RedditPost[] = [];
  let after: string | undefined;

  // Iterate through up to 10 pages (Reddit limit in this importer: 1000 posts max).
  for (let page = 0; page < 10; page += 1) {
    const feedUrl = buildRedditFeedUrl(redditUrl, sort, after, topWindow);
    const redditData = await fetchReddit(feedUrl);
    const listing = Array.isArray(redditData) ? redditData[0] : redditData;
    const posts = extractPosts(redditData);

    if (posts.length === 0) {
      break;
    }

    // Keep only posts newer than the cutoff for incremental imports.
    const freshPosts = posts.filter((post) => post.createdUtc > cutoffUtc);
    collected.push(...freshPosts);

    const oldestPostUtc = posts[posts.length - 1].createdUtc;
    const nextAfter = listing?.data?.after;

    if (!nextAfter || oldestPostUtc < cutoffUtc) {
      break;
    }

    after = String(nextAfter);
  }

  // Return deterministic oldest -> newest order for downstream processing.
  collected.sort((a, b) => a.createdUtc - b.createdUtc);
  return collected;
}
