import { RedditPost } from "./types.js";

export function extractPosts(redditData: any): RedditPost[] {
  const listing = Array.isArray(redditData) ? redditData[0] : redditData;
  const children = listing?.data?.children;

  if (!Array.isArray(children)) {
    return [];
  }

  const REDDIT_CDN = /^https?:\/\/(i|v|preview|external-preview)\.redd\.it\//;

  return children
    .map((child: any) => child?.data)
    .filter((post: any) => post?.title)
    .map((post: any) => {
      const rawUrl: string = post.url ?? "";
      const url = REDDIT_CDN.test(rawUrl) ? "" : rawUrl;
      return {
        title: post.title,
        selftext: post.selftext ?? "",
        url,
        createdUtc: Number(post.created_utc ?? 0),
        author: post.author ?? "",
      };
    });
}
