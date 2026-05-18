/**
 * @fileoverview Express server for community creation, progress polling,
 * tracked-community status, and the browser UI.
 *
 * This file is the app's orchestration layer:
 * - serves the single-page frontend
 * - exposes APIs used by the frontend
 * - stores short-lived in-memory progress state for create jobs
 * - starts the recurring background sync scheduler
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
// When running compiled output, assets live one level above `dist/`.
const projectRoot =
  path.basename(__dirname) === "dist" ? path.dirname(__dirname) : __dirname;
const indexHtmlPath = path.join(projectRoot, "index.html");
const staticDirPath = path.join(projectRoot, "static");
// Create jobs are intentionally kept in memory because they are short-lived
// progress records for the browser to poll while a community is being seeded.
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

/**
 * Serves the main HTML shell for the single-page UI.
 */
app.get("/", (_req: Request, res: Response) => {
  res.sendFile(indexHtmlPath);
});

/**
 * Returns the tracked-community list shown in the sidebar, including the most
 * recent sync status stored in SQLite.
 */
app.get("/communities", (_req: Request, res: Response): void => {
  try {
    res.json({ communities: listCreatedCommunities() });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Returns the latest in-memory progress snapshot for a create job.
 *
 * The browser polls this route after `POST /create-community` returns a job id.
 */
app.get("/create-community/:jobId", (req: Request, res: Response): void => {
  const job = createJobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "Create job not found." });
    return;
  }

  res.json(job);
});

/**
 * Starts an asynchronous community-creation job.
 *
 * This route responds immediately with a job id, then continues the heavier
 * work in the background:
 * - validate and normalize subreddit input
 * - create the Lemmy community
 * - seed the initial post batch
 * - store incremental progress for the frontend to poll
 */
app.post("/create-community", (req: Request, res: Response): void => {
  const { redditUrl }: { redditUrl: string } = req.body;
  if (typeof redditUrl !== "string" || redditUrl.trim() === "") {
    res.status(400).json({ error: "A subreddit name or Reddit URL is required." });
    return;
  }

  const jobId = crypto.randomUUID();

  // Seed an initial progress state so the frontend has something to render
  // immediately before the async workflow emits more detailed updates.
  setCreateJob(jobId, {
    stage: "creating_community",
    processedPosts: 0,
    totalPosts: 100,
    currentPostTitle: "",
    message: "Creating community...",
  });

  res.status(202).json({ jobId });

  // Run the workflow detached from the HTTP response so the browser can poll
  // for progress rather than holding one long request open.
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
      // Keep completed/failed job state around briefly so the browser can fetch
      // the terminal result even if its next poll is slightly delayed.
      scheduleCreateJobCleanup(jobId);
    }
  })();
});

// Recurring sync runs independently from user-triggered create jobs.
startCommunitySyncScheduler();
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
