/**
 * @fileoverview Login function for Lemmy.
 */

import { lemmyClient } from "./client.js";

/**
 * Logs into Lemmy using credentials from environment variables.
 *
 * @returns JWT token used for authenticated API requests.
 * @throws Error when credentials are missing or authentication fails.
 */
export async function loginLemmy(): Promise<string> {
  try {
    const username = process.env.LEMMY_USERNAME;
    const password = process.env.LEMMY_PASSWORD;

    if (!username || !password) {
      throw new Error(
        "Missing required environment variables: LEMMY_USERNAME and/or LEMMY_PASSWORD",
      );
    }

    const res = await lemmyClient.login({
      username_or_email: username,
      password,
    });
    if (!res.jwt) {
      throw new Error("No JWT returned");
    }
    lemmyClient.setHeaders({ Authorization: `Bearer ${res.jwt}` });
    console.log("Logged in");
    return res.jwt;
  } catch (error) {
    console.error("Login error:", (error as Error).message);
    throw new Error(`Lemmy login failed: ${(error as Error).message}`);
  }
}
