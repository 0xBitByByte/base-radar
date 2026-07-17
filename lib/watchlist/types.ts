export type WatchlistItem = {
  projectId: string;
  addedAt: string;
};

export type Watchlist = {
  version: 1;
  items: WatchlistItem[];
};
