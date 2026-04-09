/**
 * @fileoverview Shared Lemmy API client bootstrap.
 */

import "dotenv/config";
import { LemmyHttp } from "lemmy-js-client";

const lemmyBaseUrl = process.env.LEMMY_BASE_URL;

if (!lemmyBaseUrl) {
  throw new Error("Missing required environment variable: LEMMY_BASE_URL");
}

/** Shared Lemmy API client configured from environment variables. */
export const lemmyClient = new LemmyHttp(lemmyBaseUrl);
