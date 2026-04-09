/**
 * @fileoverview Shared server-side types for Reddit import workflows.
 */

/**
 * Normalized Reddit post data used by importer workflows.
 */
export type RedditPost = {
  redditId: string;
  title: string;
  selftext: string;
  url: string;
  imageUrl: string; // i.redd.it URL for pictrs re-upload, empty if none
  createdUtc: number;
  author: string;
};

/** Feed sort modes supported by Reddit listing endpoints. */
export type FeedSort = "new" | "top";
/** Allowed time windows for Reddit `top` feed queries. */
export type TopWindow = "hour" | "day" | "week" | "month" | "year" | "all";

/** Summary result for a completed import run. */
export type ImportResult = {
  importedCount: number;
};

/** Minimal Reddit post shape consumed by this importer. */
export type RedditRawPostData = {
  id?: string;
  title?: string;
  selftext?: string;
  url?: string;
  created_utc?: number;
  author?: string;
};

/** Reddit post shape after required importer fields have been validated. */
export type RedditRawPostWithRequiredFields = RedditRawPostData & {
  id: string;
  title: string;
};

/** Reddit listing child entry wrapper. */
export type RedditListingChild = {
  data?: RedditRawPostData;
};

/** Reddit listing payload shape used by subreddit feed endpoints. */
export type RedditListingResponse = {
  data?: {
    children?: RedditListingChild[];
  };
};

/** Reddit feed endpoints may return either a listing or an array-wrapped listing. */
export type RedditListingPayload =
  | RedditListingResponse
  | RedditListingResponse[];

/** Minimal Lemmy post payload used after createPost succeeds. */
export type LemmyCreatedPost = {
  id: number;
};
