/**
 * @fileoverview Shared server-side types for Reddit import workflows.
 */

/**
 * Normalized Reddit post data used by importer workflows.
 */
export type RedditPost = {
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
  latestImportedUtc: number;
};
