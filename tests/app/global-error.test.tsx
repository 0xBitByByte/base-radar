import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import GlobalError from "@/app/global-error";

// PR-097.03 (Observability) — before this file existed, an error in the
// root layout itself (not caught by any route-level error.tsx, which never
// wraps the layout.tsx above it) fell through to Next's bare default error
// screen with nothing logged anywhere. This exercises the real component.
describe("GlobalError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the real caught error — never silently discarded", () => {
    const error = Object.assign(new Error("root layout failure"), { digest: "root-err-1" });
    render(<GlobalError error={error} retry={() => {}} />);

    expect(console.error).toHaveBeenCalledWith(error);
  });

  it("renders a real, readable fallback with a working retry control", () => {
    const error = Object.assign(new Error("root layout failure"), { digest: "root-err-1" });
    const retry = vi.fn();
    render(<GlobalError error={error} retry={retry} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Try again" });
    button.click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("re-logs when a new real error replaces the previous one", () => {
    const first = Object.assign(new Error("first failure"), { digest: "aaa" });
    const { rerender } = render(<GlobalError error={first} retry={() => {}} />);
    expect(console.error).toHaveBeenCalledWith(first);

    const second = Object.assign(new Error("second failure"), { digest: "bbb" });
    rerender(<GlobalError error={second} retry={() => {}} />);

    expect(console.error).toHaveBeenCalledWith(second);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
