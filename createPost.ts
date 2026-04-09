/**
 * @fileoverview Lemmy post creation helper.
 */

import { lemmyClient } from "./client.js";
import { LemmyCreatedPost } from "./types.js";

/**
 * Creates a new post on Lemmy.
 *
 * @param communityId Target Lemmy community id.
 * @param title Post title.
 * @param body Post body text.
 * @param url Optional URL attached to the post.
 * @returns Created post payload from Lemmy.
 * @throws Error when post creation fails.
 */
export async function createLemmyPost(
  communityId: number,
  title: string,
  body: string,
  url: string,
): Promise<LemmyCreatedPost> {
  try {
    const res = await lemmyClient.createPost({
      name: title,
      body,
      ...(url ? { url } : {}),
      community_id: communityId,
    });
    return res.post_view.post;
  } catch (error) {
    console.error("Post creation error:", (error as Error).message);
    throw new Error(`Lemmy post creation failed: ${(error as Error).message}`);
  }
}
