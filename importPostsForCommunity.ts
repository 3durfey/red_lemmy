import { createLemmyPost } from "./createPost.js";
import { hasImportedPost, markPostImported } from "./importedPostsDb.js";
import { prepareLemmyPostInput } from "./prepareLemmyPostInput.js";
import { ImportResult, RedditPost } from "./types.js";

type ImportProgress = {
  currentPostTitle?: string;
  processedPosts: number;
  totalPosts: number;
};

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
 * @param onProgress Optional callback used by the progress UI.
 * @returns Import summary with imported post count.
 */
export async function importPostsForCommunity(
  jwt: string,
  communityId: number,
  posts: RedditPost[],
  onProgress?: (progress: ImportProgress) => void,
): Promise<ImportResult> {
  const totalPosts = posts.length;

  if (posts.length === 0) {
    return { importedCount: 0 };
  }

  let importedCount = 0;
  let processedPosts = 0;

  for (const post of posts) {
    const progressTitle = post.title;
    onProgress?.({
      currentPostTitle: progressTitle,
      processedPosts,
      totalPosts,
    });

    // Skip duplicate work before any media upload or Lemmy API call.
    if (hasImportedPost(post.redditId, communityId)) {
      processedPosts += 1;
      onProgress?.({
        currentPostTitle: progressTitle,
        processedPosts,
        totalPosts,
      });
      continue;
    }

    const preparedPost = await prepareLemmyPostInput(post, jwt);

    if (!preparedPost) {
      // Record permanently non-importable posts so they are not retried each cycle.
      markPostImported(post.redditId, communityId, null);
      processedPosts += 1;
      onProgress?.({
        currentPostTitle: progressTitle,
        processedPosts,
        totalPosts,
      });
      continue;
    }

    try {
      const createdPost = await createLemmyPost(
        communityId,
        preparedPost.title,
        preparedPost.body,
        preparedPost.url,
      );
      markPostImported(post.redditId, communityId, createdPost?.id ?? null);
      importedCount += 1;
    } catch (error) {
      console.error("Skipping failed post import:", {
        redditId: post.redditId,
        title: preparedPost.title,
        author: post.author,
        createdUtc: post.createdUtc,
        error: (error as Error).message,
      });
    } finally {
      processedPosts += 1;
      onProgress?.({
        currentPostTitle: progressTitle,
        processedPosts,
        totalPosts,
      });
    }
  }

  return { importedCount };
}
