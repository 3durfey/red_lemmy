/**
 * @fileoverview Shared types for community creation job state and final results.
 */

/** Final payload returned to the browser after community creation completes. */
export type CreateCommunitySuccess = {
  communityName: string;
  communityTitle: string;
  federatedName: string;
  communityUrl: string;
  postImported: boolean;
  importedCount: number;
  totalSeedPosts: number;
  message?: string;
};

/** Pollable create-job state used by the progress UI. */
export type CreateJobState = {
  stage: "creating_community" | "adding_posts" | "completed" | "failed";
  processedPosts: number;
  totalPosts: number;
  currentPostTitle: string;
  message: string;
  result?: CreateCommunitySuccess;
  error?: string;
};
