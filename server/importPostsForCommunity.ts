import { createLemmyPost } from "../lemmy/createPost.js";
import { ImportResult, RedditPost } from "./types.js";

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
    const title = post.author
      ? `${post.title} - posted by u/${post.author}`
      : post.title;
    await createLemmyPost(
      jwt,
      communityId,
      title,
      post.selftext,
      post.url,
    );
    importedCount += 1;
    latestImportedUtc = Math.max(latestImportedUtc, post.createdUtc);
  }

  return { importedCount, latestImportedUtc };
}
