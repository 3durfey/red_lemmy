/**
 * @fileoverview Background scheduler for recurring community sync jobs.
 */

import { listCreatedCommunities } from "./createdCommunitiesDb.js";
import { getNextSyncDelayMs } from "./getNextSyncDelayMs.js";
import { syncTrackedCommunity } from "./syncTrackedCommunity.js";

function scheduleNextRun(runCycle: () => Promise<void>): void {
  const delayMs = getNextSyncDelayMs();
  setTimeout(() => {
    void runCycle();
  }, delayMs);
}

/**
 * Starts the recurring background sync loop for tracked communities.
 */
export function startCommunitySyncScheduler(): void {
  const runCycle = async (): Promise<void> => {
    try {
      const communities = listCreatedCommunities().filter(
        (community) => community.communityId && community.redditUrl,
      );
      // Run each tracked community independently so one slow sync does not block the rest.
      await Promise.allSettled(
        communities.map((community) => syncTrackedCommunity(community)),
      );
    } catch (error) {
      console.error("Recurring sync cycle failed:", (error as Error).message);
    } finally {
      scheduleNextRun(runCycle);
    }
  };

  scheduleNextRun(runCycle);
}
