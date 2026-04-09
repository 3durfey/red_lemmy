/**
 * @fileoverview Reddit JSON fetch helper.
 */

import axios from "axios";
import { RedditListingPayload } from "./types.js";

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36";
const ALLOWED_REDDIT_HOSTS = new Set([
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "redd.it",
]);

/**
 * Fetches Reddit JSON data from a given URL.
 *
 * @param url Reddit URL or feed URL.
 * @returns Reddit JSON payload.
 * @throws Error when request fails.
 */
export async function fetchReddit(url: string): Promise<RedditListingPayload> {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_REDDIT_HOSTS.has(parsed.hostname.toLowerCase())) {
      throw new Error("Only Reddit URLs are supported.");
    }
    if (!parsed.pathname.endsWith(".json")) {
      parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}.json`;
    }
    url = parsed.toString();
  } catch (error) {
    if (error instanceof Error && error.message === "Only Reddit URLs are supported.") {
      throw error;
    }
    throw new Error("A valid Reddit URL is required.");
  }

  const response = await axios.get<RedditListingPayload>(url, {
    headers: { "User-Agent": MOBILE_UA },
  });
  return response.data;
}
