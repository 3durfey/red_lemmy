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
import { loginLemmy } from "./login.js";

/**
 * Runs one recurring import cycle for a tracked community.
 *
 * @param community Community record with sync configuration.
 */
export async function syncTrackedCommunity(
  community: StoredCommunity,
): Promise<void> {
  markCommunitySyncStarted(community.communityName);

  try {
    const jwt = await loginLemmy();
    const posts = await fetchHourlyRecurringPosts(community.redditUrl);
    await importPostsForCommunity(jwt, community.communityId, posts);
    markCommunitySyncSucceeded(community.communityName);
  } catch (error) {
    markCommunitySyncFailed(community.communityName, (error as Error).message);
    throw error;
  }
}
