import { FeedSort, TopWindow } from "./types.js";

export function buildRedditFeedUrl(
  redditUrl: string,
  sort: FeedSort,
  after?: string,
  topWindow: TopWindow = "day",
): string {
  const url = new URL(redditUrl);
  const path = url.pathname.replace(/\/+$/, "");
  const suffix = sort === "top" ? "/top" : "/new";
  const basePath = path.endsWith(suffix) ? path : `${path}${suffix}`;
  url.pathname = basePath;
  url.searchParams.set("limit", "100");
  if (sort === "top") {
    url.searchParams.set("t", topWindow);
  }
  if (after) {
    url.searchParams.set("after", after);
  } else {
    url.searchParams.delete("after");
  }
  return url.toString();
}
