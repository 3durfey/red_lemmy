/**
 * @fileoverview Helpers for deriving host values from Lemmy base URLs.
 */

/**
 * Extracts the host portion of `LEMMY_BASE_URL`.
 *
 * Returns an empty string when the env var is missing.
 *
 * @returns Lemmy host such as `thelemmy.club`, or empty string.
 */
export function getLemmyHost(): string {
  const baseUrl = process.env.LEMMY_BASE_URL;

  if (!baseUrl) {
    return "";
  }

  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
}
