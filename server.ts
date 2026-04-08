/**
 * @fileoverview Server for Reddit to Lemmy data extraction and import.
 * Provides endpoints to fetch Reddit data and import posts to Lemmy communities.
 */

import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { loginLemmy } from "./login.js";
import { createLemmyCommunity } from "./createCommunity.js";
import { extractSubredditName } from "./extractSubredditName.js";
import { getLemmyHost } from "./getLemmyHost.js";
import { fetchPostsFromLast24Hours } from "./fetchPostsFromLast24Hours.js";
import { importPostsForCommunity } from "./importPostsForCommunity.js";
import { normalizeRedditSubredditUrl } from "./normalizeRedditUrl.js";
import { FeedSort, TopWindow } from "./types.js";

const app = express();
const VALID_IMPORT_MODES: FeedSort[] = ["new", "top"];
const VALID_TOP_WINDOWS: TopWindow[] = [
  "hour",
  "day",
  "week",
  "month",
  "year",
  "all",
];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot =
  path.basename(__dirname) === "dist" ? path.dirname(__dirname) : __dirname;
const indexHtmlPath = path.join(projectRoot, "index.html");

app.use(express.json());
app.get("/", (_req: Request, res: Response) => {
  res.sendFile(indexHtmlPath);
});

/**
 * @route POST /create-community
 * @desc Creates a new Lemmy community based on Reddit subreddit URL.
 * @param {Request} req - Express request with body.redditUrl
 * @param {Response} res - Express response
 */
app.post(
  "/create-community",
  async (req: Request, res: Response): Promise<void> => {
    const {
      redditUrl,
      importMode,
      topWindow,
    }: {
      redditUrl: string;
      importMode?: string;
      topWindow?: string;
    } = req.body;

    console.log("Raw redditUrl received:", redditUrl);

    try {
      const normalizedRedditUrl = normalizeRedditSubredditUrl(redditUrl);
      const subreddit = extractSubredditName(normalizedRedditUrl);
      const jwt = await loginLemmy();
      const sort: FeedSort = VALID_IMPORT_MODES.includes(importMode as FeedSort)
        ? (importMode as FeedSort)
        : "new";
      const timeWindow: TopWindow = VALID_TOP_WINDOWS.includes(
        topWindow as TopWindow,
      )
        ? (topWindow as TopWindow)
        : "day";
      const community = await createLemmyCommunity(subreddit, subreddit, "");
      const communityId = community.id;

      const recentPosts = await fetchPostsFromLast24Hours(
        normalizedRedditUrl,
        sort,
        timeWindow,
      );
      const importResult = await importPostsForCommunity(
        jwt,
        communityId,
        recentPosts,
      );
      const lemmyHost = getLemmyHost();
      const federatedName = lemmyHost
        ? `${community.name}@${lemmyHost}`
        : community.name;
      const communityUrl = process.env.LEMMY_BASE_URL
        ? `${process.env.LEMMY_BASE_URL.replace(/\/+$/, "")}/c/${community.name}`
        : "";

      if (importResult.importedCount === 0) {
        res.json({
          success: true,
          communityId,
          communityName: community.name,
          communityTitle: community.title,
          federatedName,
          communityUrl,
          subreddit,
          postImported: false,
          importedCount: 0,
          message:
            "Community created, but no posts from the last 24 hours were found.",
        });
        return;
      }

      res.json({
        success: true,
        communityId,
        communityName: community.name,
        communityTitle: community.title,
        federatedName,
        communityUrl,
        subreddit,
        postImported: importResult.importedCount > 0,
        importedCount: importResult.importedCount,
      });
    } catch (error) {
      const message = (error as Error).message;
      const status = /supported|subreddit name|\/r\//i.test(message)
        ? 400
        : 500;
      res.status(status).json({ error: message });
    }
  },
);

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
