/**
 * PR-086.05 — one shared page-header typography/spacing system, in the same
 * "exported class-string constants, not a wrapper component" shape
 * `components/ui/glassStyles.ts` already established for the glass system.
 * A wrapper component was considered and rejected: the pages this applies
 * to (Watchlists, Alerts, Automation, Notification Center, the four
 * Settings pages, and the five `[slug]/*` Explorer sub-pages) each have
 * genuinely different header *content* — Alerts inlines an unread-count
 * badge beside its title, Automation/Notifications add a trailing
 * settings-link or action-button row, the sub-pages have no action row at
 * all — forcing all of that into one generic component's prop API would
 * either balloon into a kitchen sink or strip real content. What actually
 * varied page to page without any real reason was the *typography and
 * spacing*: `font-semibold` vs `font-bold` for the same-role `<h1>`, and
 * `gap-1`/`gap-1.5`/`gap-0.5`/`mt-1.5` for the same title-to-subtitle
 * relationship (confirmed via a full 13-page audit, PR-086.05). These
 * constants fix that — each page keeps its own header structure, just
 * built from the same classes as every other page in this group.
 *
 * Deliberately NOT applied to: the Dashboard greeting (`WelcomeHeader.tsx`,
 * its own larger `sm:text-3xl` hero treatment), the Explorer root/
 * collection-route headers (`ProjectsHeader.tsx`/`ProjectsCollectionPage.tsx`,
 * which carry a CTA/back-link/live-count that make them a different kind
 * of header, not a page title + subtitle), the AI Report masthead (its own
 * bordered "report cover" card, not a bare title), and Project Details'
 * `ProfileHeader` identity hero — all four are deliberate, already-tuned,
 * richer treatments; unifying them here would be exactly the kind of
 * layout redesign this pass is told not to do.
 */
export const PAGE_HEADER_GROUP_CLASS = "flex flex-col gap-1";
export const PAGE_HEADER_TITLE_CLASS = "text-xl font-semibold text-radar-light-text dark:text-radar-white";
export const PAGE_HEADER_SUBTITLE_CLASS = "text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted";
