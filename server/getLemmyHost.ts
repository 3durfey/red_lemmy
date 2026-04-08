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
