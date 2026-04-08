import { fetchReddit } from "../reddit.js";
import { buildRedditFeedUrl } from "./buildRedditFeedUrl.js";
import { extractPosts } from "./extractPosts.js";
import { FeedSort, RedditPost, TopWindow } from "./types.js";

export async function fetchPostsSinceUtc(
  redditUrl: string,
  cutoffUtc: number,
  sort: FeedSort = "new",
  topWindow: TopWindow = "day",
): Promise<RedditPost[]> {
  const collected: RedditPost[] = [];
  let after: string | undefined;

  for (let page = 0; page < 10; page += 1) {
    const feedUrl = buildRedditFeedUrl(redditUrl, sort, after, topWindow);
    const redditData = await fetchReddit(feedUrl);
    const listing = Array.isArray(redditData) ? redditData[0] : redditData;
    const posts = extractPosts(redditData);

    if (posts.length === 0) {
      break;
    }

    const freshPosts = posts.filter((post) => post.createdUtc > cutoffUtc);
    collected.push(...freshPosts);

    const oldestPostUtc = posts[posts.length - 1].createdUtc;
    const nextAfter = listing?.data?.after;

    if (!nextAfter || oldestPostUtc < cutoffUtc) {
      break;
    }

    after = String(nextAfter);
  }

  collected.sort((a, b) => a.createdUtc - b.createdUtc);
  return collected;
}
