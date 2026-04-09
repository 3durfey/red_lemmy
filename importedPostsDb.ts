/**
 * @fileoverview SQLite-backed import ledger for Reddit post deduplication.
 */

import Database from "better-sqlite3";

const db = new Database("red_lemmy.sqlite");

db.exec(`
  CREATE TABLE IF NOT EXISTS imported_posts (
    reddit_id TEXT NOT NULL,
    community_id INTEGER NOT NULL,
    lemmy_post_id INTEGER,
    PRIMARY KEY (reddit_id, community_id)
  )
`);

const hasImportedStmt = db.prepare(`
  SELECT 1
  FROM imported_posts
  WHERE reddit_id = ? AND community_id = ?
  LIMIT 1
`);

const markImportedStmt = db.prepare(`
  INSERT INTO imported_posts (
    reddit_id,
    community_id,
    lemmy_post_id
  ) VALUES (?, ?, ?)
`);

/**
 * Checks whether a Reddit post id has already been imported for a community.
 *
 * @param redditId Reddit post id.
 * @param communityId Lemmy community id.
 * @returns True when the post was already imported.
 */
export function hasImportedPost(
  redditId: string,
  communityId: number,
): boolean {
  return Boolean(hasImportedStmt.get(redditId, communityId));
}

/**
 * Records a successful Reddit-to-Lemmy post import.
 *
 * @param redditId Reddit post id.
 * @param communityId Lemmy community id.
 * @param lemmyPostId Created Lemmy post id, when available.
 */
export function markPostImported(
  redditId: string,
  communityId: number,
  lemmyPostId: number | null,
): void {
  markImportedStmt.run(redditId, communityId, lemmyPostId);
}
