export function extractSubredditName(redditUrl: string): string {
  const match = redditUrl.match(/\/r\/([^/?#]+)/i);
  return match?.[1] ?? "unknown";
}
