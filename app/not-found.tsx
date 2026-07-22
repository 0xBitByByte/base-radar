import { Compass } from "lucide-react";
import Link from "next/link";

import { HeaderLogo } from "@/components/branding/HeaderLogo";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * The application-wide 404. Next.js renders this for any unmatched route
 * and for any explicit `notFound()` call (e.g. an invalid project slug in
 * `app/dashboard/projects/[slug]/page.tsx`) that isn't caught by a more
 * specific `not-found.tsx` — this is the only one defined, so it's the
 * one boundary for both cases. Framework-rendered `not-found.tsx` pages
 * are served with a real HTTP 404 status by Next.js itself; nothing here
 * changes routing behavior.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <HeaderLogo height={28} />
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or may have moved."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              Back to Home
            </Link>
          </div>
        }
      />
    </div>
  );
}
