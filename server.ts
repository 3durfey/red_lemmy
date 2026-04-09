/**
 * @fileoverview Express server for community creation, status, and the web UI.
 */

import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { CreateJobState } from "./createCommunityJobTypes.js";
import { runCreateCommunityJob } from "./createCommunityJob.js";
import { listCreatedCommunities } from "./createdCommunitiesDb.js";
import { startCommunitySyncScheduler } from "./startCommunitySyncScheduler.js";

const CREATE_JOB_RETENTION_MS = 15 * 60 * 1000;
const PORT = Number(process.env.PORT || 3000);

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot =
  path.basename(__dirname) === "dist" ? path.dirname(__dirname) : __dirname;
const indexHtmlPath = path.join(projectRoot, "index.html");
const staticDirPath = path.join(projectRoot, "static");
const createJobs = new Map<string, CreateJobState>();

/** Stores the latest pollable state for an in-flight create job. */
function setCreateJob(jobId: string, job: CreateJobState): void {
  createJobs.set(jobId, job);
}

/** Removes finished job state after a short retention window. */
function scheduleCreateJobCleanup(jobId: string): void {
  setTimeout(() => {
    createJobs.delete(jobId);
  }, CREATE_JOB_RETENTION_MS);
}

app.use(express.json());
app.use("/static", express.static(staticDirPath));

app.get("/", (_req: Request, res: Response) => {
  res.sendFile(indexHtmlPath);
});

app.get("/communities", (_req: Request, res: Response): void => {
  try {
    res.json({ communities: listCreatedCommunities() });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/create-community/:jobId", (req: Request, res: Response): void => {
  const job = createJobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "Create job not found." });
    return;
  }

  res.json(job);
});

app.post("/create-community", (req: Request, res: Response): void => {
  const { redditUrl }: { redditUrl: string } = req.body;
  if (typeof redditUrl !== "string" || redditUrl.trim() === "") {
    res.status(400).json({ error: "A subreddit name or Reddit URL is required." });
    return;
  }

  const jobId = crypto.randomUUID();

  setCreateJob(jobId, {
    stage: "creating_community",
    processedPosts: 0,
    totalPosts: 100,
    currentPostTitle: "",
    message: "Creating community...",
  });

  res.status(202).json({ jobId });

  void (async () => {
    console.log("Raw redditUrl received:", redditUrl);

    try {
      const result = await runCreateCommunityJob(redditUrl, (job) => {
        setCreateJob(jobId, job);
      });

      setCreateJob(jobId, {
        stage: "completed",
        processedPosts: result.totalSeedPosts,
        totalPosts: result.totalSeedPosts,
        currentPostTitle: "",
        message: "Community creation complete.",
        result,
      });
    } catch (error) {
      setCreateJob(jobId, {
        stage: "failed",
        processedPosts: 0,
        totalPosts: 100,
        currentPostTitle: "",
        message: "Community creation failed.",
        error: (error as Error).message,
      });
    } finally {
      scheduleCreateJobCleanup(jobId);
    }
  })();
});

startCommunitySyncScheduler();
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
