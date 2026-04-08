/**
 * @fileoverview Shared Lemmy HTTP client instance.
 */

import "dotenv/config";
import { LemmyHttp } from "lemmy-js-client";

const lemmyBaseUrl = process.env.LEMMY_BASE_URL;

if (!lemmyBaseUrl) {
  throw new Error("Missing required environment variable: LEMMY_BASE_URL");
}

export const lemmyClient = new LemmyHttp(lemmyBaseUrl);
