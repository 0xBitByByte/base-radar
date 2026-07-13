import type { ReactNode } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

type StaticPageProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * Shared shell for the small set of standalone pages the footer links to
 * (About, Contact, Privacy, Terms) — same Navbar/Footer chrome as the
 * landing page, one consistent prose column, so these don't each hand-roll
 * their own layout.
 */
export function StaticPage({ title, description, children }: StaticPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-radar-light-bg dark:bg-radar-bg">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28 lg:px-8">
          <h1 className="text-4xl font-semibold tracking-tight text-radar-light-text sm:text-5xl dark:text-radar-white">
            {title}
          </h1>
          {description && (
            <p className="mt-4 text-lg text-radar-light-muted dark:text-radar-muted">{description}</p>
          )}
          <div className="mt-12 flex flex-col gap-8 text-sm leading-relaxed text-radar-light-muted [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-radar-light-text [&_p]:leading-relaxed [&_a]:text-radar-primary [&_a]:underline [&_a]:underline-offset-2 dark:text-radar-muted dark:[&_h2]:text-radar-white dark:[&_a]:text-radar-accent">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
