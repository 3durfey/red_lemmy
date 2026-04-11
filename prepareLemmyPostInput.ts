/**
 * @fileoverview Helpers for converting Reddit posts into Lemmy post input.
 */

import { buildLemmyPostTitle } from "./buildLemmyPostTitle.js";
import { RedditPost } from "./types.js";
import { uploadToPictrs } from "./uploadToPictrs.js";

type PreparedLemmyPostInput = {
  title: string;
  body: string;
  url: string;
};

/**
 * Builds Lemmy post input for a Reddit post, including optional image rehosting.
 *
 * Returns null when the post has neither usable body text nor a usable URL.
 *
 * @param post Normalized Reddit post.
 * @param jwt Lemmy JWT for pictrs uploads.
 * @returns Prepared post input or null when the post should be skipped.
 */
function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function prepareLemmyPostInput(
  post: RedditPost,
  jwt: string,
): Promise<PreparedLemmyPostInput | null> {
  const title = buildLemmyPostTitle(post.title, post.author);
  let url = post.url;

  if (post.imageUrl) {
    const pictrsUrl = await uploadToPictrs(post.imageUrl, jwt);
    if (pictrsUrl) {
      url = pictrsUrl;
    }
  }

  // If the URL is not a valid http/https URL, only keep the post if a pictrs
  // image was successfully uploaded. Otherwise drop it entirely.
  if (url && !isValidHttpUrl(url)) {
    if (!post.imageUrl) {
      console.warn(`Dropping post ${post.redditId}: invalid URL and no image`);
      return null;
    }
    // imageUrl was present but pictrs upload failed (url still the invalid one)
    const hasPictrsUrl = url !== post.url;
    if (!hasPictrsUrl) {
      console.warn(
        `Dropping post ${post.redditId}: invalid URL and pictrs upload failed`,
      );
      return null;
    }
  }

  if (!url && !post.selftext.trim()) {
    return null;
  }

  return {
    title,
    body: post.selftext,
    url,
  };
}
