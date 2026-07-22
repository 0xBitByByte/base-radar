import { permanentRedirect } from "next/navigation";

/** The pre-consolidation singular route remains as a permanent compatibility redirect. */
export default function WatchlistPage() {
  permanentRedirect("/dashboard/watchlists");
}
