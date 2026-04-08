export type RedditPost = {
  title: string;
  selftext: string;
  url: string;
  createdUtc: number;
  author: string;
};

export type FeedSort = "new" | "top";
export type TopWindow = "hour" | "day" | "week" | "month" | "year" | "all";

export type ImportResult = {
  importedCount: number;
  latestImportedUtc: number;
};
