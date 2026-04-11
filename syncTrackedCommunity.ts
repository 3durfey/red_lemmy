/**
 * @fileoverview Recurring sync worker for a single tracked community.
 */

import {
  markCommunitySyncFailed,
  markCommunitySyncStarted,
  markCommunitySyncSucceeded,
  StoredCommunity,
} from "./createdCommunitiesDb.js";
import { fetchHourlyRecurringPosts } from "./fetchHourlyRecurringPosts.js";
import { importPostsForCommunity } from "./importPostsForCommunity.js";

/**
 * Runs one recurring import cycle for a tracked community.
 *
 * @param community Community record with sync configuration.
 * @param jwt Lemmy JWT obtained once for the current sync cycle.
 */
export async function syncTrackedCommunity(
  community: StoredCommunity,
  jwt: string,
): Promise<void> {
  console.log(
    `[sync] Starting sync for ${community.communityName} (${community.redditUrl})`,
  );
  markCommunitySyncStarted(community.communityName);

  try {
    const posts = await fetchHourlyRecurringPosts(community.redditUrl);
    const result = await importPostsForCommunity(
      jwt,
      community.communityId,
      posts,
    );
    markCommunitySyncSucceeded(community.communityName, result.importedCount);
    console.log(
      `[sync] Finished ${community.communityName}: imported ${result.importedCount} new post(s) from ${posts.length} fetched`,
    );
  } catch (error) {
    console.error(
      `[sync] Failed ${community.communityName}:`,
      (error as Error).message,
    );
    markCommunitySyncFailed(community.communityName, (error as Error).message);
    throw error;
  }
}
