/**
 * @fileoverview Create community function for Lemmy.
 */

import { lemmyClient } from "./client.js";
import "dotenv/config";

type CreatedCommunity = {
  id: number;
  name: string;
  title: string;
};

function buildCommunityName(subredditName: string): string {
  const MAX_LEN = 20;
  const clean = subredditName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const base = clean || "reddit";
  return base.slice(0, MAX_LEN);
}

/**
 * Creates a new community on Lemmy based on Reddit subreddit URL.
 * @param {string} jwt - JWT token for authentication.
 * @param {string} redditUrl - Reddit URL to extract subreddit name from.
 * @param {string} title - Title for the new community.
 * @param {string} description - Description for the new community.
 * @returns {Promise<CreatedCommunity>} Created community info.
 * @throws {Error} If community creation fails.
 */
export async function createLemmyCommunity(
  jwt: string,
  redditUrl: string,
  title: string,
  description: string,
): Promise<CreatedCommunity> {
  const subredditMatch = redditUrl.match(/\/r\/([^\/]+)/);
  const subredditName = subredditMatch ? subredditMatch[1] : "unknown";
  const communityName = buildCommunityName(subredditName);

  console.log("Subreddit URL:", redditUrl);
  console.log("Extracted subreddit name:", subredditName);
  console.log("Final community name:", communityName);

  try {
    const res = await lemmyClient.createCommunity({
      name: communityName,
      title,
      description,
    });
    return {
      id: res.community_view.community.id,
      name: res.community_view.community.name,
      title: res.community_view.community.title,
    };
  } catch (error) {
    console.error("Community creation error:", (error as Error).message);
    throw new Error(
      `Lemmy community creation failed: ${(error as Error).message}`,
    );
  }
}
