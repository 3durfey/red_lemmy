/**
 * @fileoverview Reddit fetch helper.
 */

import axios from "axios";

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36";

/**
 * Fetches Reddit JSON data from a given URL.
 * @param {string} url - Reddit URL to fetch.
 * @returns {Promise<any>} Reddit JSON data.
 * @throws {Error} If the fetch fails.
 */
export async function fetchReddit(url: string): Promise<any> {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith(".json")) {
      parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}.json`;
    }
    url = parsed.toString();
  } catch {
    if (!url.endsWith(".json")) {
      url = url.replace(/\/$/, "") + ".json";
    }
  }

  const response = await axios.get(url, {
    headers: { "User-Agent": MOBILE_UA },
  });
  return response.data;
}
