/**
 * @fileoverview Background scheduler for recurring community sync jobs.
 */

import { listCreatedCommunities } from "./createdCommunitiesDb.js";
import { getNextSyncDelayMs } from "./getNextSyncDelayMs.js";
import { loginLemmy } from "./login.js";
import { syncTrackedCommunity } from "./syncTrackedCommunity.js";

const MAX_PARALLEL_SYNCS = 1;
const REDDIT_BACKOFF_INITIAL_MS = 5 * 60 * 1000;
const REDDIT_BACKOFF_MAX_MS = 2 * 60 * 60 * 1000;

type RedditBackoffEntry = {
  attempts: number;
  untilMs: number;
};

const redditBackoffByCommunity = new Map<string, RedditBackoffEntry>();

function isRedditRateLimitOrBlock(message: string): boolean {
  return /status code (403|429)/i.test(message);
}

function scheduleRedditBackoff(communityName: string): void {
  const previousAttempts =
    redditBackoffByCommunity.get(communityName)?.attempts ?? 0;
  const attempts = previousAttempts + 1;
  const delayMs = Math.min(
    REDDIT_BACKOFF_INITIAL_MS * 2 ** (attempts - 1),
    REDDIT_BACKOFF_MAX_MS,
  );
  const untilMs = Date.now() + delayMs;
  redditBackoffByCommunity.set(communityName, { attempts, untilMs });

  console.warn(
    `[scheduler] Backing off ${communityName} for ${Math.round(
      delayMs / 1000,
    )}s after Reddit ${attempts > 1 ? "repeated " : ""}403/429`,
  );
}

function clearRedditBackoff(communityName: string): void {
  if (redditBackoffByCommunity.delete(communityName)) {
    console.log(`[scheduler] Cleared Reddit backoff for ${communityName}`);
  }
}

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
      const allCommunities = listCreatedCommunities().filter(
        (community) => community.communityId && community.redditUrl,
      );

      const nowMs = Date.now();
      const communities = allCommunities.filter((community) => {
        const backoff = redditBackoffByCommunity.get(community.communityName);
        if (!backoff) return true;

        if (nowMs >= backoff.untilMs) {
          redditBackoffByCommunity.delete(community.communityName);
          return true;
        }

        const remainingSeconds = Math.ceil((backoff.untilMs - nowMs) / 1000);
        console.log(
          `[scheduler] Skipping ${community.communityName} (${remainingSeconds}s Reddit backoff remaining)`,
        );
        return false;
      });

      console.log(
        `[scheduler] Running sync cycle for ${communities.length} community/communities`,
      );

      if (communities.length === 0) return;

      // Login once per cycle so parallel community syncs share a single JWT.
      const jwt = await loginLemmy();

      // Run syncs with bounded concurrency to avoid bursty Reddit traffic.
      const queue = [...communities];
      const workerCount = Math.min(MAX_PARALLEL_SYNCS, queue.length);

      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (true) {
            const community = queue.shift();
            if (!community) return;

            try {
              await syncTrackedCommunity(community, jwt);
              clearRedditBackoff(community.communityName);
            } catch (error) {
              const message = (error as Error).message;
              if (isRedditRateLimitOrBlock(message)) {
                scheduleRedditBackoff(community.communityName);
              }
            }
          }
        }),
      );
    } catch (error) {
      console.error("Recurring sync cycle failed:", (error as Error).message);
    } finally {
      scheduleNextRun(runCycle);
    }
  };

  // Run immediately on startup, then schedule subsequent runs with jitter.
  void runCycle();
}
