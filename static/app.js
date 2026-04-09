let communitiesPollHandle = null;

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function clearOutput(output) {
  output.replaceChildren();
}

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

function renderError(output, message) {
  clearOutput(output);
  appendParagraph(output, `Failed to create community: ${message}`);
}

function showProgress() {
  document.getElementById("progress-shell").style.display = "block";
}

function hideProgress() {
  document.getElementById("progress-shell").style.display = "none";
}

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
    "Recurring updates will add the first 100 posts from new and the top 100 posts from the last 24 hours.",
  );
  appendParagraph(output, postMessage);
}

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

    item.appendChild(linkWrapper);
    item.appendChild(meta);
    item.appendChild(statusLine);
    list.appendChild(item);
  }
}

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

function startCommunitiesPolling() {
  if (communitiesPollHandle) {
    window.clearInterval(communitiesPollHandle);
  }

  communitiesPollHandle = window.setInterval(() => {
    void loadCommunities();
  }, 5000);
}

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
