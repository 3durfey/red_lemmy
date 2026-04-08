import { fetchPostsSinceUtc } from "./fetchPostsSinceUtc.js";
import { RedditPost } from "./types.js";

export async function fetchPostsFromLast24Hours(
  redditUrl: string,
): Promise<RedditPost[]> {
  const cutoffUtc = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  return fetchPostsSinceUtc(redditUrl, cutoffUtc, "new", "day");
}
