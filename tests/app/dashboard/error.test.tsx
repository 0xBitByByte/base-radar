import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import DashboardError from "@/app/dashboard/error";

// PR-097.03 (Observability) — before this fix, the real `error` this
// boundary receives was declared in its props type but never read, so a
// genuine render failure anywhere under `/dashboard/*` vanished the moment
// the fallback UI rendered. This exercises the real component (never
// mocked) to prove the caught error is now actually logged.
describe("DashboardError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the real caught error — never silently discarded", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<DashboardError error={error} reset={() => {}} />);

    expect(console.error).toHaveBeenCalledWith(error);
  });

  it("still renders the real fallback UI, unchanged by the logging fix", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<DashboardError error={error} reset={() => {}} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Dashboard" })).toBeInTheDocument();
  });

  it("re-logs when a new real error replaces the previous one, rather than only logging once", () => {
    const first = Object.assign(new Error("first failure"), { digest: "aaa" });
    const { rerender } = render(<DashboardError error={first} reset={() => {}} />);
    expect(console.error).toHaveBeenCalledWith(first);

    const second = Object.assign(new Error("second failure"), { digest: "bbb" });
    rerender(<DashboardError error={second} reset={() => {}} />);

    expect(console.error).toHaveBeenCalledWith(second);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
