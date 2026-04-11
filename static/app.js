/**
 * @fileoverview Browser UI logic for the Reddit-to-Lemmy community creator.
 *
 * Handles community creation form submission, job progress polling,
 * success/error rendering, and recurring community list refresh.
 */

/** setInterval handle for the community list auto-refresh, or null when not running. */
let communitiesPollHandle = null;

/**
 * Escapes a string for safe insertion as text content (defense against XSS).
 * @param {string} text - Raw text to escape.
 * @returns {string} HTML-escaped string.
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

/**
 * Removes all child nodes from an output container.
 * @param {HTMLElement} output - Container to clear.
 */
function clearOutput(output) {
  output.replaceChildren();
}

/**
 * Appends a paragraph element to an output container.
 * @param {HTMLElement} output - Container to append to.
 * @param {string} text - Plain text content (used when strongText is omitted).
 * @param {string} [strongText] - Bold text content; when provided, text is ignored.
 */
function appendParagraph(output, text, strongText) {
  const paragraph = document.createElement("p");
  if (strongText) {
    const strong = document.createElement("strong");
    strong.textContent = strongText;
    paragraph.appendChild(strong);
  } else {
    paragraph.textContent = text;
  }
  output.appendChild(paragraph);
}

/**
 * Renders a user-facing error message into the output container.
 * @param {HTMLElement} output - Container to render into.
 * @param {string} message - Error detail text.
 */
function renderError(output, message) {
  clearOutput(output);
  appendParagraph(output, `Failed to create community: ${message}`);
}

/** Shows the progress bar section. */
function showProgress() {
  document.getElementById("progress-shell").style.display = "block";
}

/** Hides the progress bar section. */
function hideProgress() {
  document.getElementById("progress-shell").style.display = "none";
}

/**
 * Updates the progress bar and status text from a polled job state object.
 * @param {{ message?: string, processedPosts?: number, totalPosts?: number }} job
 */
function updateProgress(job) {
  const bar = document.getElementById("progress-bar");
  const copy = document.getElementById("progress-copy");
  const stats = document.getElementById("progress-stats");
  const totalPosts = Number(job.totalPosts) > 0 ? Number(job.totalPosts) : 100;
  const processedPosts = Math.max(0, Number(job.processedPosts) || 0);

  bar.max = totalPosts;
  bar.value = Math.min(processedPosts, totalPosts);
  copy.textContent = job.message || "Creating community...";
  stats.textContent = `${Math.min(processedPosts, totalPosts)} / ${totalPosts} posts`;
}

/**
 * Returns the display class name and label text for a community's sync state.
 * @param {{ syncStatus: string, lastError?: string }} community
 * @returns {{ className: string, text: string }}
 */
function formatSyncState(community) {
  if (community.syncStatus === "running") {
    return {
      className: "status-running",
      text: "Updating",
    };
  }

  if (community.syncStatus === "error") {
    return {
      className: "status-error",
      text: community.lastError
        ? `Tracking with last error: ${community.lastError}`
        : "Tracking with last error",
    };
  }

  return {
    className: "status-idle",
    text: "Tracking",
  };
}

/**
 * Renders the community creation success state into the output container.
 * @param {HTMLElement} output - Container to render into.
 * @param {object} data - Completed job result payload from the server.
 */
function renderSuccess(output, data) {
  clearOutput(output);

  const communitySlug = data.communityName || "";
  const communityLink = data.communityUrl || `/c/${communitySlug}`;
  const communityTitle = data.communityTitle || communitySlug;
  const federatedName = data.federatedName || communitySlug;
  const postMessage =
    data.postImported && Number.isInteger(data.importedCount)
      ? `Imported ${data.importedCount} top post(s) from all time.`
      : data.message || "Community created, but no post was imported.";

  appendParagraph(output, "Community created!");
  appendParagraph(output, "", communityTitle);

  const linkParagraph = document.createElement("p");
  const link = document.createElement("a");
  link.href = communityLink;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = federatedName;
  linkParagraph.appendChild(link);
  output.appendChild(linkParagraph);

  appendParagraph(
    output,
    "Recurring updates will add the first 100 posts from new and the top 100 posts from the last hour.",
  );
  appendParagraph(output, postMessage);
}

/**
 * Renders the tracked community list into the sidebar.
 * Clears and rebuilds the list on every call.
 * @param {object[]} communities - Array of community records from GET /communities.
 */
function renderCommunityList(communities) {
  const status = document.getElementById("community-list-status");
  const list = document.getElementById("community-list");
  list.replaceChildren();

  if (!Array.isArray(communities) || communities.length === 0) {
    status.textContent = "No communities have been recorded yet.";
    return;
  }

  status.textContent = "";

  for (const community of communities) {
    const syncState = formatSyncState(community);
    const item = document.createElement("li");
    item.className = "community-item";

    const linkWrapper = document.createElement("div");
    const link = document.createElement("a");
    link.href = community.communityUrl || "";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = community.communityTitle || community.communityName;
    linkWrapper.appendChild(link);

    const meta = document.createElement("div");
    meta.className = "community-meta";
    meta.textContent = `c/${community.communityName} from r/${community.subreddit}`;

    const statusLine = document.createElement("div");
    statusLine.className = `community-status ${syncState.className}`;
    statusLine.dataset.communityStatus = community.communityName;
    statusLine.textContent = syncState.text;

    const syncInfo = document.createElement("div");
    syncInfo.className = "community-sync-info";
    if (
      community.lastImportedCount !== null &&
      community.lastImportedCount !== undefined
    ) {
      const count = community.lastImportedCount;
      syncInfo.textContent = `Last sync added ${count} post${count === 1 ? "" : "s"}`;
    }

    item.appendChild(linkWrapper);
    item.appendChild(meta);
    item.appendChild(statusLine);
    if (
      community.lastImportedCount !== null &&
      community.lastImportedCount !== undefined
    ) {
      item.appendChild(syncInfo);
    }
    list.appendChild(item);
  }
}

/**
 * Fetches the community list from the server and re-renders the sidebar.
 * Displays an inline error message if the request fails.
 */
async function loadCommunities() {
  const status = document.getElementById("community-list-status");

  try {
    const response = await fetch("/communities");
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} - ${text}`,
      );
    }

    const data = await response.json();
    renderCommunityList(data.communities || []);
  } catch (error) {
    status.textContent = `Failed to load communities: ${error.message}`;
  }
}

/**
 * Starts (or restarts) the 5-second community list polling interval.
 * Clears any existing interval before starting a new one.
 */
function startCommunitiesPolling() {
  if (communitiesPollHandle) {
    window.clearInterval(communitiesPollHandle);
  }

  communitiesPollHandle = window.setInterval(() => {
    void loadCommunities();
  }, 5000);
}

/**
 * Polls GET /create-community/:jobId every 500ms until the job completes or fails.
 * Updates the progress bar on each tick.
 * @param {string} jobId - Job ID returned by POST /create-community.
 * @param {HTMLButtonElement} button - Submit button, re-enabled on network error.
 * @returns {Promise<object>} Resolves with the job result payload on success.
 */
function pollCreateJob(jobId, button) {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const response = await fetch(`/create-community/${jobId}`);
        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${response.statusText} - ${text}`,
          );
        }

        const job = await response.json();
        updateProgress(job);

        if (job.stage === "completed") {
          resolve(job.result);
          return;
        }

        if (job.stage === "failed") {
          reject(new Error(job.error || "Community creation failed."));
          return;
        }

        window.setTimeout(poll, 500);
      } catch (error) {
        button.disabled = false;
        reject(error);
      }
    };

    poll();
  });
}

/**
 * Handles the community creation form submission.
 * Validates input, posts to the server, polls for progress, and renders the result.
 */
async function createCommunity() {
  const input = document.getElementById("subreddit").value.trim();
  const output = document.getElementById("output");
  const button = document.getElementById("create-button");
  clearOutput(output);

  if (!input) {
    renderError(output, "A subreddit name or Reddit URL is required.");
    return;
  }

  button.disabled = true;
  showProgress();
  updateProgress({
    message: "Creating community...",
    processedPosts: 0,
    totalPosts: 100,
  });

  const redditUrl = input.startsWith("http")
    ? input
    : `https://www.reddit.com/r/${input}`;

  try {
    const response = await fetch("/create-community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redditUrl }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} - ${text}`,
      );
    }

    const { jobId } = await response.json();
    const data = await pollCreateJob(jobId, button);
    hideProgress();
    renderSuccess(output, data);
    await loadCommunities();
  } catch (error) {
    hideProgress();
    renderError(output, error.message);
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("create-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void createCommunity();
  });

  document.getElementById("community-list-status").textContent =
    "Loading communities...";
  void loadCommunities();
  startCommunitiesPolling();
});
