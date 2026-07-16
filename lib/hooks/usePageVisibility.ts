"use client";

import { useEffect, useState } from "react";

function isVisible(): boolean {
  // SSR/first-render default — `document` doesn't exist server-side, and
  // treating a not-yet-hydrated page as "visible" avoids every polling
  // hook built on this needlessly deferring its first real check.
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

/**
 * Live boolean for whether this tab is currently visible, via the Page
 * Visibility API. `usePolling` uses this to pause polling entirely while
 * the tab is hidden rather than burning provider rate-limit budget on
 * updates nobody can see.
 */
export function usePageVisibility(): boolean {
  const [visible, setVisible] = useState(isVisible);

  useEffect(() => {
    function handleChange() {
      setVisible(isVisible());
    }

    document.addEventListener("visibilitychange", handleChange);
    return () => document.removeEventListener("visibilitychange", handleChange);
  }, []);

  return visible;
}
