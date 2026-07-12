"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { BrandSpinner } from "@/components/ui/BrandSpinner";

/** Held for at least this long once a navigation starts, even if the
 * destination route resolves instantly — without a floor, a fast/synchronous
 * route change (most of this app's routes today, since none stream async
 * server data) would make the overlay flash for a single frame or not
 * appear at all, defeating the point of a deliberate branded transition. */
const MIN_HOLD_MS = 450;

type NavigationOverlayContextValue = {
  pendingHref: string | null;
  startNavigation: (href: string) => void;
};

const NavigationOverlayContext = createContext<NavigationOverlayContextValue | null>(null);

/**
 * Sidebar destinations are almost entirely synchronous/client-rendered
 * today, so Next's own `loading.tsx` Suspense fallback rarely has anything
 * to actually suspend on and often never appears. This tracks "the user
 * just clicked a nav item" independently of whether the destination segment
 * suspends, so the branded loader can be shown immediately and reliably on
 * every sidebar navigation, not just the ones that happen to be slow.
 * Wraps the full layout (Sidebar + content) so `useStartNavigation` is
 * reachable from `SidebarItem`; the visual overlay itself is a separate
 * `NavigationOverlay` component placed only over the content region.
 */
export function NavigationOverlayProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const startedAtRef = useRef(0);

  const startNavigation = useCallback(
    (href: string) => {
      if (href === pathname) return;
      startedAtRef.current = Date.now();
      setPendingHref(href);
    },
    [pathname]
  );

  useEffect(() => {
    if (!pendingHref || pathname !== pendingHref) return;
    const elapsed = Date.now() - startedAtRef.current;
    const timer = setTimeout(() => setPendingHref(null), Math.max(0, MIN_HOLD_MS - elapsed));
    return () => clearTimeout(timer);
  }, [pathname, pendingHref]);

  return (
    <NavigationOverlayContext.Provider value={{ pendingHref, startNavigation }}>
      {children}
    </NavigationOverlayContext.Provider>
  );
}

function useNavigationOverlayContext() {
  const ctx = useContext(NavigationOverlayContext);
  if (!ctx) {
    throw new Error("useNavigationOverlayContext must be used within NavigationOverlayProvider");
  }
  return ctx;
}

/** Called from `SidebarItem`'s `onClick` to trigger the overlay. */
export function useStartNavigation() {
  return useNavigationOverlayContext().startNavigation;
}

/**
 * The visual overlay — rendered inside the content column specifically
 * (not over the Sidebar, which stays interactive during the transition),
 * using the exact same `BrandSpinner` every other loading state in the app
 * uses, at the large `xl` tier for a cinematic, full-region presence.
 */
export function NavigationOverlay() {
  const { pendingHref } = useNavigationOverlayContext();
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {pendingHref && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 z-40 flex items-center justify-center bg-radar-light-bg/95 backdrop-blur-sm dark:bg-radar-bg/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
        >
          <BrandSpinner tier="xl" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
