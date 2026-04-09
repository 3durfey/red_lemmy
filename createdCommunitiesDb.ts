/**
 * @fileoverview SQLite-backed storage for created Lemmy communities and sync state.
 */

import Database from "better-sqlite3";

/** Tracked community row returned to the server and browser UI. */
export type StoredCommunity = {
  communityId: number;
  communityName: string;
  communityTitle: string;
  communityUrl: string;
  subreddit: string;
  redditUrl: string;
  syncStatus: string;
  lastSyncedAt: string | null;
  lastError: string | null;
};

const db = new Database("red_lemmy.sqlite");

db.exec(`
  CREATE TABLE IF NOT EXISTS created_communities (
    community_id INTEGER NOT NULL UNIQUE,
    community_name TEXT NOT NULL PRIMARY KEY,
    community_title TEXT NOT NULL,
    community_url TEXT NOT NULL,
    subreddit TEXT NOT NULL,
    reddit_url TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'idle',
    last_synced_at TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const storeCommunityStmt = db.prepare(`
  INSERT INTO created_communities (
    community_id,
    community_name,
    community_title,
    community_url,
    subreddit,
    reddit_url,
    sync_status
  ) VALUES (?, ?, ?, ?, ?, ?, 'idle')
  ON CONFLICT(community_name) DO UPDATE SET
    community_id = excluded.community_id,
    community_title = excluded.community_title,
    community_url = excluded.community_url,
    subreddit = excluded.subreddit,
    reddit_url = excluded.reddit_url
`);

const listCommunitiesStmt = db.prepare(`
  SELECT
    community_id AS communityId,
    community_name AS communityName,
    community_title AS communityTitle,
    community_url AS communityUrl,
    subreddit,
    reddit_url AS redditUrl,
    sync_status AS syncStatus,
    last_synced_at AS lastSyncedAt,
    last_error AS lastError
  FROM created_communities
  ORDER BY datetime(created_at) DESC, community_name ASC
`);

const markSyncStartedStmt = db.prepare(`
  UPDATE created_communities
  SET
    sync_status = 'running',
    last_error = NULL
  WHERE community_name = ?
`);

const markSyncSucceededStmt = db.prepare(`
  UPDATE created_communities
  SET
    sync_status = 'idle',
    last_synced_at = CURRENT_TIMESTAMP,
    last_error = NULL
  WHERE community_name = ?
`);

const markSyncFailedStmt = db.prepare(`
  UPDATE created_communities
  SET
    sync_status = 'error',
    last_error = ?
  WHERE community_name = ?
`);

/**
 * Inserts or updates a tracked community record after creation.
 *
 * @param communityId Lemmy community id.
 * @param communityName Lemmy community slug.
 * @param communityTitle Lemmy display title.
 * @param communityUrl Full public community URL.
 * @param subreddit Source subreddit name.
 * @param redditUrl Canonical Reddit subreddit URL.
 */
export function storeCreatedCommunity(
  communityId: number,
  communityName: string,
  communityTitle: string,
  communityUrl: string,
  subreddit: string,
  redditUrl: string,
): void {
  storeCommunityStmt.run(
    communityId,
    communityName,
    communityTitle,
    communityUrl,
    subreddit,
    redditUrl,
  );
}

/**
 * Returns tracked communities in sidebar display order.
 *
 * @returns Stored community rows ordered newest first.
 */
export function listCreatedCommunities(): StoredCommunity[] {
  return listCommunitiesStmt.all() as StoredCommunity[];
}

/**
 * Marks a tracked community as actively syncing.
 *
 * @param communityName Lemmy community slug.
 */
export function markCommunitySyncStarted(communityName: string): void {
  markSyncStartedStmt.run(communityName);
}

/**
 * Marks a tracked community as successfully synced.
 *
 * @param communityName Lemmy community slug.
 */
export function markCommunitySyncSucceeded(communityName: string): void {
  markSyncSucceededStmt.run(communityName);
}

/**
 * Records the last sync failure for a tracked community.
 *
 * @param communityName Lemmy community slug.
 * @param errorMessage Last sync error message.
 */
export function markCommunitySyncFailed(
  communityName: string,
  errorMessage: string,
): void {
  markSyncFailedStmt.run(errorMessage, communityName);
}
