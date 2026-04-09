/**
 * @fileoverview Workflow for creating a Lemmy community and seeding initial posts.
 */

import {
  CreateCommunitySuccess,
  CreateJobState,
} from "./createCommunityJobTypes.js";
import {
  markCommunitySyncFailed,
  storeCreatedCommunity,
} from "./createdCommunitiesDb.js";
import { createLemmyCommunity } from "./createCommunity.js";
import { extractSubredditName } from "./extractSubredditName.js";
import { fetchRedditFeedPage } from "./fetchRedditFeedPage.js";
import { getLemmyHost } from "./getLemmyHost.js";
import { importPostsForCommunity } from "./importPostsForCommunity.js";
import { loginLemmy } from "./login.js";
import { normalizeRedditSubredditUrl } from "./normalizeRedditUrl.js";

/**
 * Runs the full create-community workflow and emits progress updates.
 *
 * @param redditUrl User-provided subreddit input.
 * @param onUpdate Callback for pushing progress state.
 * @returns Final success payload for the completed job.
 */
export async function runCreateCommunityJob(
  redditUrl: string,
  onUpdate: (state: CreateJobState) => void,
): Promise<CreateCommunitySuccess> {
  const normalizedRedditUrl = normalizeRedditSubredditUrl(redditUrl);
  const subreddit = extractSubredditName(normalizedRedditUrl);
  const jwt = await loginLemmy();
  const community = await createLemmyCommunity(subreddit, subreddit, "");
  const lemmyHost = getLemmyHost();
  const federatedName = lemmyHost ? `${community.name}@${lemmyHost}` : community.name;
  const communityUrl = process.env.LEMMY_BASE_URL
    ? `${process.env.LEMMY_BASE_URL.replace(/\/+$/, "")}/c/${community.name}`
    : "";

  // Store the community before seeding so recurring sync can recover after a partial failure.
  storeCreatedCommunity(
    community.id,
    community.name,
    community.title,
    communityUrl,
    subreddit,
    normalizedRedditUrl,
  );

  try {
    const seedPosts = await fetchRedditFeedPage(normalizedRedditUrl, "top", "all");

    onUpdate({
      stage: "adding_posts",
      processedPosts: 0,
      totalPosts: seedPosts.length,
      currentPostTitle: "",
      message: "Adding posts...",
    });

    const importResult = await importPostsForCommunity(
      jwt,
      community.id,
      seedPosts,
      ({ currentPostTitle, processedPosts, totalPosts }) => {
        onUpdate({
          stage: "adding_posts",
          processedPosts,
          totalPosts,
          currentPostTitle: currentPostTitle ?? "",
          message: currentPostTitle
            ? `Adding post: ${currentPostTitle}`
            : "Adding posts...",
        });
      },
    );

    if (importResult.importedCount === 0) {
      return {
        communityName: community.name,
        communityTitle: community.title,
        federatedName,
        communityUrl,
        postImported: false,
        importedCount: 0,
        totalSeedPosts: seedPosts.length,
        message: "Community created, but no top posts were found to import.",
      };
    }

    return {
      communityName: community.name,
      communityTitle: community.title,
      federatedName,
      communityUrl,
      postImported: true,
      importedCount: importResult.importedCount,
      totalSeedPosts: seedPosts.length,
    };
  } catch (error) {
    markCommunitySyncFailed(community.name, (error as Error).message);
    throw error;
  }
}
