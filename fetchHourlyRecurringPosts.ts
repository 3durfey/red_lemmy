/**
 * @fileoverview Recurring Reddit batch fetch helper.
 */

import { fetchRedditFeedPage } from "./fetchRedditFeedPage.js";
import { RedditPost } from "./types.js";

/**
 * Fetches the recurring hourly import batch:
 * the first 100 posts from `new` plus the top 100 posts from the last 24 hours.
 *
 * Duplicates are intentionally left in the combined list because downstream
 * deduplication already keys off Reddit post ids before posting to Lemmy.
 *
 * @param redditUrl Base subreddit URL.
 * @returns Combined recurring import batch.
 */
export async function fetchHourlyRecurringPosts(
  redditUrl: string,
): Promise<RedditPost[]> {
  const [newPosts, topPosts] = await Promise.all([
    fetchRedditFeedPage(redditUrl, "new"),
    fetchRedditFeedPage(redditUrl, "top", "day"),
  ]);

  return [...newPosts, ...topPosts];
}
