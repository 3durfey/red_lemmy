/**
 * @fileoverview Reddit JSON fetch helper.
 */

import axios from "axios";
import { RedditListingPayload } from "./types.js";

// Inspired by Redlib's approach of making upstream requests look less anomalous
// than a bare script fetch. This does not implement Redlib's anonymous OAuth
// token spoofing, but it does send a more realistic mobile-browser profile and
// rotates through a small set of Reddit hostnames before failing.
const REDDIT_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36";
const ALLOWED_REDDIT_HOSTS = new Set([
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "redd.it",
]);
const REDDIT_HOST_RETRY_ORDER = ["www.reddit.com", "old.reddit.com", "reddit.com"];
const REDDIT_HEADERS = {
  "User-Agent": REDDIT_UA,
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.reddit.com/",
  DNT: "1",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
} as const;

async function requestRedditUrl(url: URL): Promise<RedditListingPayload> {
  const response = await axios.get<RedditListingPayload>(url.toString(), {
    headers: REDDIT_HEADERS,
    timeout: 15000,
  });
  return response.data;
}

/**
 * Fetches Reddit JSON data from a given URL.
 *
 * @param url Reddit URL or feed URL.
 * @returns Reddit JSON payload.
 * @throws Error when request fails.
 */
export async function fetchReddit(url: string): Promise<RedditListingPayload> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!ALLOWED_REDDIT_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
      throw new Error("Only Reddit URLs are supported.");
    }
    if (!parsedUrl.pathname.endsWith(".json")) {
      parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/+$/, "")}.json`;
    }
    parsedUrl.searchParams.set("raw_json", "1");
    url = parsedUrl.toString();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Only Reddit URLs are supported."
    ) {
      throw error;
    }
    throw new Error("A valid Reddit URL is required.");
  }

  const requestUrl = new URL(url);
  const attemptedHosts = new Set<string>([requestUrl.hostname]);
  let lastError: unknown;

  for (const hostname of [requestUrl.hostname, ...REDDIT_HOST_RETRY_ORDER]) {
    if (attemptedHosts.has(hostname) && hostname !== requestUrl.hostname) {
      continue;
    }
    attemptedHosts.add(hostname);

    const retryUrl = new URL(requestUrl.toString());
    retryUrl.hostname = hostname;

    try {
      return await requestRedditUrl(retryUrl);
    } catch (error) {
      lastError = error;
      if (!axios.isAxiosError(error)) {
        throw error;
      }

      const status = error.response?.status;
      if (status !== 403 && status !== 429) {
        throw error;
      }

      console.warn(
        `[reddit] ${status} from ${retryUrl.hostname} for ${retryUrl.pathname}; trying next Reddit host if available`,
      );
    }
  }

  if (axios.isAxiosError(lastError) && lastError.response?.status) {
    throw new Error(
      `Reddit blocked the request after trying ${Array.from(attemptedHosts).join(", ")} with status ${lastError.response.status}`,
    );
  }

  throw lastError;
}
