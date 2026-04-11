/**
 * @fileoverview Lemmy authentication helper.
 */

import { lemmyClient } from "./client.js";

/**
 * Logs into Lemmy using credentials from environment variables.
 * Performs a raw fetch first so HTTP status and body are available for diagnostics
 * when the Lemmy server returns a generic error like "unknown".
 *
 * @returns JWT token used for authenticated API requests.
 * @throws Error when credentials are missing or authentication fails.
 */
export async function loginLemmy(): Promise<string> {
  const username = process.env.LEMMY_USERNAME;
  const password = process.env.LEMMY_PASSWORD;
  const baseUrl = process.env.LEMMY_BASE_URL?.replace(/\/+$/, "");

  if (!username || !password) {
    throw new Error(
      "Missing required environment variables: LEMMY_USERNAME and/or LEMMY_PASSWORD",
    );
  }

  // Use a direct fetch so we can capture the HTTP status code and raw body,
  // giving actionable diagnostics when the client would only surface "unknown".
  let rawResponse: Response;
  let body: Record<string, unknown>;

  try {
    rawResponse = await fetch(`${baseUrl}/api/v3/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username_or_email: username, password }),
    });
    body = (await rawResponse.json()) as Record<string, unknown>;
  } catch (networkError) {
    const msg = (networkError as Error).message || "network error";
    console.error("Login network error:", msg);
    throw new Error(`Lemmy login failed: ${msg}`);
  }

  if (!rawResponse.ok) {
    const serverError =
      typeof body.error === "string" && body.error.trim()
        ? body.error.trim()
        : rawResponse.statusText || "unknown";
    console.error(
      `Login failed: HTTP ${rawResponse.status} — ${serverError}`,
      "| Check LEMMY_USERNAME, LEMMY_PASSWORD, and LEMMY_BASE_URL in your .env",
    );
    throw new Error(
      `Lemmy login failed: HTTP ${rawResponse.status} ${serverError}`,
    );
  }

  const jwt = typeof body.jwt === "string" ? body.jwt : null;
  if (!jwt) {
    throw new Error("Lemmy login failed: no JWT in response");
  }

  lemmyClient.setHeaders({ Authorization: `Bearer ${jwt}` });
  console.log("Logged in");
  return jwt;
}
