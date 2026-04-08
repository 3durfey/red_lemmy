import { createLemmyPost } from "./createPost.js";
import { buildLemmyPostTitle } from "./buildLemmyPostTitle.js";
import { uploadToPictrs } from "./uploadToPictrs.js";
import { ImportResult, RedditPost } from "./types.js";

/**
 * Imports a batch of Reddit posts into a Lemmy community.
 *
 * For each post, builds a safe title, optionally re-uploads Reddit-hosted
 * images to pictrs, creates the Lemmy post, and tracks summary stats.
 * Individual post failures are logged and skipped so the batch can continue.
 *
 * @param jwt Lemmy auth token.
 * @param communityId Target Lemmy community id.
 * @param posts Normalized posts to import.
 * @returns Import summary with count and latest imported timestamp.
 */
export async function importPostsForCommunity(
  jwt: string,
  communityId: number,
  posts: RedditPost[],
): Promise<ImportResult> {
  if (posts.length === 0) {
    return { importedCount: 0, latestImportedUtc: 0 };
  }

  let importedCount = 0;
  let latestImportedUtc = 0;

  for (const post of posts) {
    const title = buildLemmyPostTitle(post.title, post.author);

    // Keep only non-Reddit external URLs.
    let postUrl = post.url;

    // Try to re-host Reddit photos on Lemmy's pictrs to avoid hotlink blocking.
    if (post.imageUrl) {
      const pictrsUrl = await uploadToPictrs(post.imageUrl, jwt);
      if (pictrsUrl) postUrl = pictrsUrl;
    }

    // Skip Reddit-only link posts when no external URL or rehosted image is available.
    if (!postUrl && !post.selftext.trim()) {
      continue;
    }

    try {
      await createLemmyPost(communityId, title, post.selftext, postUrl);
      importedCount += 1;
      latestImportedUtc = Math.max(latestImportedUtc, post.createdUtc);
    } catch (error) {
      console.error("Skipping failed post import:", {
        title,
        author: post.author,
        createdUtc: post.createdUtc,
        error: (error as Error).message,
      });
    }
  }

  return { importedCount, latestImportedUtc };
}
