/**
 * @fileoverview Lemmy community creation helper.
 */

import { lemmyClient } from "./client.js";
import { buildCommunityName } from "./buildCommunityName.js";

type CreatedCommunity = {
  id: number;
  name: string;
  title: string;
};

/**
 * Creates a new community on Lemmy from a normalized subreddit name.
 *
 * @param subredditName Normalized subreddit name used to derive the community slug.
 * @param title Community display title.
 * @param description Community description text.
 * @returns Created community metadata.
 * @throws Error when community creation fails.
 */
export async function createLemmyCommunity(
  subredditName: string,
  title: string,
  description: string,
): Promise<CreatedCommunity> {
  const communityName = buildCommunityName(subredditName);

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
