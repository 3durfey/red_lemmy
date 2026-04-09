# red_lemmy

A Node.js/TypeScript tool that mirrors Reddit subreddits to [Lemmy](https://join-lemmy.org/) communities. Point it at a subreddit, and it creates a matching Lemmy community, seeds it with the top 100 posts of all time, then keeps it updated on a jittered hourly cadence by importing both the first 100 posts from `new` and the top 100 posts from the last 24 hours.

## Features

- Creates a Lemmy community from a subreddit name or Reddit subreddit URL
- Seeds new communities with the top 100 Reddit posts of all time
- Runs recurring background syncs roughly every hour with jitter to avoid a rigid polling pattern
- Recurring syncs import both the first 100 posts from `new` and the top 100 posts from the last 24 hours
- Post titles include the original Reddit author: `Title - posted by u/username`
- Re-uploads Reddit-hosted images to Lemmy pictrs when possible; Reddit-only media posts are skipped only when they cannot be turned into a usable Lemmy post
- Deduplicates imported posts by Reddit post id using SQLite
- Simple web UI served at `http://localhost:3000` by default, with progress tracking and recurring sync status

## Requirements

- Node.js 20+
- A Lemmy account with permission to create communities
- SQLite is handled locally through `better-sqlite3`; no separate database server is required

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a `.env` file** in the project root:

   ```env
   LEMMY_BASE_URL=https://your-lemmy-instance.com
   LEMMY_USERNAME=your_username
   LEMMY_PASSWORD=your_password
   ```

3. **Build**

   ```bash
   npm run build
   ```

4. **Run**

   ```bash
   npm start
   ```

   Or build + run in one step:

   ```bash
   npm run dev
   ```

   The server starts at `http://localhost:3000` by default.
   Set `PORT` to use a different port.

## Usage

Open `http://localhost:3000` in your browser. Enter a subreddit name (e.g. `horses`) or full URL (e.g. `https://reddit.com/r/horses`) and click **Create Community**.

The tool will:

1. Create a Lemmy community with a sanitized slug (lowercase, max 20 chars)
2. Import the top 100 Reddit posts of all time into the new community
3. Track the community in SQLite for recurring sync
4. Continue checking roughly every hour and import up to 200 posts per cycle: the first 100 `new` posts and the top 100 posts from the last 24 hours
5. Return the federated community address (e.g. `horses@your-lemmy-instance.com`)

## How It Works

This program has two main jobs:

1. Create and seed a Lemmy community from a subreddit
2. Keep that Lemmy community updated over time

### 1. Web UI and API

- The browser loads `index.html` plus the static frontend assets from `/static`
- When you submit a subreddit, the page sends `POST /create-community`
- The server immediately returns a job id
- The page polls `GET /create-community/:jobId` to show the progress bar and current post title

### 2. Create the Lemmy community

When a create request comes in, the server:

1. Validates that a subreddit name or Reddit URL was provided
2. Normalizes the subreddit input into a canonical Reddit URL
3. Extracts the subreddit name
4. Logs into Lemmy
5. Creates a matching Lemmy community

At that point, the new community is also stored in SQLite so the recurring sync system can find it later, even if the initial seed import fails.

### 3. Seed the new community

After the Lemmy community is created, the program:

1. Fetches the top 100 Reddit posts of all time for that subreddit
2. Normalizes the Reddit JSON into internal post objects
3. Walks through each post one by one
4. Skips posts whose Reddit id has already been imported
5. Re-uploads Reddit-hosted images to Lemmy pictrs when possible
6. Creates the Lemmy post
7. Records the Reddit id in SQLite so it will not be posted again later

The progress bar you see in the browser is driven by this seed-import loop.

### 4. Deduplication

The program uses SQLite to avoid reposting the same Reddit content.

- `created_communities` stores which Lemmy communities are being tracked
- `imported_posts` stores Reddit post ids that have already been imported for each community

That means the app does not need to guess based on titles or URLs. It checks the Reddit id directly.

### 5. Recurring sync

When the server starts, it also starts a background scheduler.

On each recurring cycle, it:

1. Loads all tracked communities from SQLite
2. For each one, fetches:
   - the first 100 posts from Reddit `new`
   - the top 100 posts from the last 24 hours
3. Merges those two lists
4. Tries to import them into the matching Lemmy community
5. Skips anything whose Reddit id is already in the import ledger
6. Updates the tracked community status in SQLite

The timing is roughly hourly, but the delay is jittered a bit so it does not run on a perfectly rigid schedule.

### 6. File responsibilities

- `server.ts`: Express routes and in-memory progress-job tracking
- `createCommunityJob.ts`: the create-and-seed workflow
- `importPostsForCommunity.ts`: batch import loop for Reddit posts
- `fetchRedditFeedPage.ts`: one-page Reddit feed fetch helper
- `fetchHourlyRecurringPosts.ts`: recurring sync fetch plan
- `createdCommunitiesDb.ts`: tracked community storage and sync status
- `importedPostsDb.ts`: Reddit id dedupe ledger
- `startCommunitySyncScheduler.ts`: recurring scheduler
- `index.html`: browser UI shell
- `static/style.css`: browser styles
- `static/app.js`: browser behavior and polling

## API Endpoints

| Method | Path                | Description                       |
| ------ | ------------------- | --------------------------------- |
| `POST` | `/create-community` | Create community and start seed import |
| `GET`  | `/create-community/:jobId` | Poll seed import progress |
| `GET`  | `/communities` | List tracked communities and sync status |

### `POST /create-community`

**Request body:**

```json
{
  "redditUrl": "https://reddit.com/r/horses"
}
```

`redditUrl` may be a plain subreddit name like `horses` or a Reddit subreddit URL.

**Response:**

```json
{
  "jobId": "9d87a0ad-7f87-4ca5-8553-b8f7a30574a2"
}
```

The client should poll `GET /create-community/:jobId` until the job is `completed` or `failed`.

## Project Structure

```
README.md                       # Project overview and usage guide
buildCommunityName.ts           # Lemmy community slug builder
buildLemmyPostTitle.ts          # Lemmy-safe post title builder
buildRedditFeedUrl.ts           # Reddit feed URL builder
client.ts                       # Lemmy HTTP client initialization
createCommunity.ts              # Community creation
createCommunityJob.ts           # Community creation + seed import workflow
createCommunityJobTypes.ts      # Shared progress-job and create-result types
createPost.ts                   # Post creation
createdCommunitiesDb.ts         # SQLite store for tracked communities and sync status
extractPosts.ts                 # Reddit payload normalization
extractSubredditName.ts         # Subreddit name extraction
fetchHourlyRecurringPosts.ts    # Recurring sync batch: first 100 new + top 100 from last 24 hours
fetchRedditFeedPage.ts          # Single-page Reddit feed fetch helper
getLemmyHost.ts                 # Lemmy host extraction from base URL
getNextSyncDelayMs.ts           # Jittered recurring-sync delay helper
importPostsForCommunity.ts      # Batch import loop for Reddit posts
importedPostsDb.ts              # SQLite dedupe ledger for Reddit post ids
index.html                      # Web UI
static/app.js                   # Browser behavior and API polling
static/style.css                # Browser styles
login.ts                        # Lemmy authentication
normalizeRedditUrl.ts           # Subreddit input normalization
package-lock.json               # Generated npm lockfile
package.json                    # Package metadata and scripts
prepareLemmyPostInput.ts        # Converts Reddit posts into Lemmy post input
reddit.ts                       # Reddit JSON fetch helper
server.ts                       # Express app and route handlers
startCommunitySyncScheduler.ts  # Recurring sync loop with jitter
syncTrackedCommunity.ts         # Recurring sync worker per community
tsconfig.json                   # TypeScript compiler configuration
types.ts                        # Shared TypeScript types
uploadToPictrs.ts               # Pictrs image re-upload helper
```
