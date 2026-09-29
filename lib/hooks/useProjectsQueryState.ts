"use client";

import { useCallback, useEffect, useState } from "react";

import { parseProjectsQueryState, type ProjectsQueryState, type RawSearchParams } from "@/components/projects/queryState";

/**
 * Vercel production-hotspot follow-up — the client-side replacement for
 * `/dashboard/projects`/`/dashboard/projects/all` reading `searchParams`
 * server-side (see `app/dashboard/projects/page.tsx`'s own doc comment for
 * the full rationale). Parses the current URL's query string into the exact same
 * `ProjectsQueryState` shape `parseProjectsQueryState()` already produces
 * server-side — no new parsing logic, same validated/defaulted result.
 *
 * SSR-safe by construction: `window` is read only inside `useState`'s
 * lazy initializer and inside `useEffect` — both run only in the browser.
 * The server-rendered pass (and this hook's very first client render,
 * before that lazy initializer can read `location.search`) instead uses
 * `parseProjectsQueryState({})`, i.e. the same default/unfiltered state the
 * cached server shell renders — satisfying "the server-rendered/default
 * state must remain correct before hydration." Requirement #9 (initialize
 * from `location.search` "before/at hydration") is met by React's own
 * lazy-`useState`-initializer semantics: it runs synchronously during this
 * component's first client render, before paint, so a direct navigation to
 * a filtered URL shows the correct filtered content on the very first
 * client frame — no visible flash of the unfiltered default.
 */
function readStateFromLocation(): ProjectsQueryState {
  if (typeof window === "undefined") return parseProjectsQueryState({});
  const params: RawSearchParams = {};
  for (const [key, value] of new URLSearchParams(window.location.search).entries()) {
    const existing = params[key];
    if (existing === undefined) params[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else params[key] = [existing, value];
  }
  return parseProjectsQueryState(params);
}

export function useProjectsQueryState(): { state: ProjectsQueryState; navigate: (href: string) => void } {
  const [state, setState] = useState<ProjectsQueryState>(() => readStateFromLocation());

  // Browser back/forward — `popstate` fires for both; re-derive state from
  // the URL the browser just restored. Requirement #8.
  useEffect(() => {
    function handlePopState() {
      setState(readStateFromLocation());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((href: string) => {
    // The incoming `href`'s PATH is deliberately ignored, not just its
    // query — confirmed pre-existing bug in the shared, untouched
    // `ProjectsPagination.tsx`'s `hrefForPage()`: it hardcodes
    // `PROJECTS_PATH` ("/dashboard/projects") regardless of which of the
    // 12 collection routes actually renders it, so a page-2 click here
    // would otherwise arrive with the wrong route entirely. Not fixed at
    // the source (shared by the 11 out-of-scope routes) — worked around
    // here instead, self-contained to this hook: only the query string is
    // ever taken from `href`; the path this hook pushes is always the
    // real current `location.pathname`, so the URL bar and the mounted
    // page never disagree.
    const queryIndex = href.indexOf("?");
    const search = queryIndex === -1 ? "" : href.slice(queryIndex);
    // `pushState`, not `replaceState` — every prior implementation used
    // `router.push()` (a real history entry per filter/sort/page change),
    // so this preserves that same back/forward-able granularity
    // (Requirement #7/#8). The query-only href already carries the full
    // next state (`buildProjectsQuery()`), so no separate round-trip is
    // needed to know what to render — just parse it directly.
    window.history.pushState(null, "", `${window.location.pathname}${search}`);
    const params: RawSearchParams = {};
    for (const [key, value] of new URLSearchParams(search).entries()) {
      const existing = params[key];
      if (existing === undefined) params[key] = value;
      else if (Array.isArray(existing)) existing.push(value);
      else params[key] = [existing, value];
    }
    setState(parseProjectsQueryState(params));
  }, []);

  return { state, navigate };
}
