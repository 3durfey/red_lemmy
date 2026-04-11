/**
 * @fileoverview Recurring Reddit batch fetch helper.
 */

import { fetchRedditFeedPage } from "./fetchRedditFeedPage.js";
import { RedditPost } from "./types.js";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Fetches the recurring hourly import batch:
 * the first 100 posts from `new` plus the top 100 posts from the last hour.
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
  // Avoid sending back-to-back parallel requests for the same subreddit;
  // a small pause is cheaper than tripping Reddit's bot heuristics.
  const newPosts = await fetchRedditFeedPage(redditUrl, "new");
  await wait(1200 + Math.floor(Math.random() * 600));
  const topPosts = await fetchRedditFeedPage(redditUrl, "top", "hour");

  console.log(
    `[sync] Feed breakdown for ${redditUrl}: new=${newPosts.length}, top(hour)=${topPosts.length}`,
  );

  return [...newPosts, ...topPosts];
}
