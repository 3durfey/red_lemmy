/**
 * @fileoverview Helpers for normalizing Reddit listing payloads.
 */

import {
  RedditListingPayload,
  RedditPost,
  RedditRawPostWithRequiredFields,
} from "./types.js";

/**
 * Extracts normalized post data from a Reddit listing response.
 *
 * Accepts either the standard listing object or the first item in Reddit's
 * array response format, filters out invalid items, and maps each post to the
 * internal `RedditPost` shape.
 *
 * URL handling:
 * - `url` keeps non-Reddit external links only
 * - `imageUrl` keeps `i.redd.it` links for optional re-upload to pictrs
 *
 * @param redditData Reddit JSON payload from the `.json` feed endpoint.
 * @returns Normalized list of posts ready for import.
 */
export function extractPosts(redditData: RedditListingPayload): RedditPost[] {
  const listing = Array.isArray(redditData) ? redditData[0] : redditData;
  const children = listing?.data?.children;

  if (!Array.isArray(children)) {
    return [];
  }

  const REDDIT_IMAGE_CDN = /^https?:\/\/i\.redd\.it\//i;
  const REDDIT_CDN = /^https?:\/\/(i|v|preview|external-preview)\.redd\.it\//i;
  const REDDIT_DOMAIN = /^https?:\/\/([a-z0-9-]+\.)?reddit\.com\//i;
  const REDDIT_SHORT = /^https?:\/\/redd\.it\//i;

  return children
    .map((child) => child?.data)
    .filter(
      (post): post is RedditRawPostWithRequiredFields =>
        typeof post?.title === "string" && typeof post?.id === "string",
    )
    .map((post) => {
      const rawUrl: string = post.url ?? "";
      const isRedditImage = REDDIT_IMAGE_CDN.test(rawUrl);
      const isRedditLink =
        REDDIT_CDN.test(rawUrl) ||
        REDDIT_DOMAIN.test(rawUrl) ||
        REDDIT_SHORT.test(rawUrl);
      const url = isRedditLink ? "" : rawUrl;
      const imageUrl = isRedditImage ? rawUrl : "";
      return {
        redditId: post.id,
        title: post.title,
        selftext: post.selftext ?? "",
        url,
        imageUrl,
        createdUtc: Number(post.created_utc ?? 0),
        author: post.author ?? "",
      };
    });
}
