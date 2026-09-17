import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import ProjectProfileError from "@/app/dashboard/projects/[slug]/error";

// PR-097.03 (Observability) — same real, previously-discarded `error` gap
// as `app/dashboard/error.tsx` (see its own test file); this is the
// Project Profile route's separate, more specific boundary.
describe("ProjectProfileError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the real caught error — never silently discarded", () => {
    const error = Object.assign(new Error("profile render failure"), { digest: "xyz789" });
    render(<ProjectProfileError error={error} reset={() => {}} />);

    expect(console.error).toHaveBeenCalledWith(error);
  });

  it("still renders the real fallback UI, unchanged by the logging fix", () => {
    const error = Object.assign(new Error("profile render failure"), { digest: "xyz789" });
    render(<ProjectProfileError error={error} reset={() => {}} />);

    expect(screen.getByText("Couldn't load this project")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
