# red_lemmy

A Node.js/TypeScript tool that mirrors Reddit subreddits to [Lemmy](https://join-lemmy.org/) communities. Point it at a subreddit, and it creates a matching Lemmy community and imports posts from the last 24 hours using either `new` or `top` sorting.

## Features

- Creates a Lemmy community from a subreddit name or Reddit subreddit URL
- Imports Reddit posts from the last 24 hours with configurable `new` or `top` sorting (up to 1000 via pagination)
- Post titles include the original Reddit author: `Title - posted by u/username`
- Skips Reddit-hosted media (i.redd.it, v.redd.it) that would show broken images
- Simple web UI served at `http://localhost:3000`

## Requirements

- Node.js 20+
- A Lemmy account with permission to create communities

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

   The server starts at `http://localhost:3000`.

## Usage

Open `http://localhost:3000` in your browser. Enter a subreddit name (e.g. `horses`) or full URL (e.g. `https://reddit.com/r/horses`) and click **Create Community**.

The tool will:

1. Create a Lemmy community with a sanitized slug (lowercase, max 20 chars)
2. Fetch posts from the past 24 hours using the selected Reddit sort mode
3. Import each post with its title and original Reddit author
4. Return the federated community address (e.g. `horses@your-lemmy-instance.com`)

## API Endpoints

| Method | Path                | Description                       |
| ------ | ------------------- | --------------------------------- |
| `POST` | `/create-community` | Create community and import posts |

### `POST /create-community`

**Request body:**

```json
{
  "redditUrl": "https://reddit.com/r/horses",
  "importMode": "new",
  "topWindow": "day"
}
```

`importMode` supports `new` and `top`. `topWindow` is used only when `importMode` is `top`.

`redditUrl` may be a plain subreddit name like `horses` or a Reddit subreddit URL.

**Response:**

```json
{
  "success": true,
  "communityName": "horses",
  "communityTitle": "horses",
  "federatedName": "horses@your-lemmy-instance.com",
  "communityUrl": "https://your-lemmy-instance.com/c/horses",
  "importedCount": 42
}
```

## Project Structure

```
server.ts               # Express app and route handlers
reddit.ts               # Reddit JSON fetching
lemmy/
  client.ts             # Lemmy HTTP client initialization
  login.ts              # Lemmy authentication
  createCommunity.ts    # Community creation + name sanitization
  createPost.ts         # Post creation
server/
  types.ts              # Shared TypeScript types
  extractSubredditName.ts
  getLemmyHost.ts
  buildRedditFeedUrl.ts
  fetchPostsSinceUtc.ts
  fetchPostsFromLast24Hours.ts
  extractPosts.ts
  importPostsForCommunity.ts
frontend/
  index.html            # Web UI
```
