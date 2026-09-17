import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useCompareProjectDetail } from "@/lib/hooks/useCompareProjectDetail";
import type { CompareProjectDetail } from "@/lib/compare/detail";

const DETAIL: CompareProjectDetail = {
  recommendation: "Suitable for Deeper Research",
  strengths: ["Verified in the Base Radar registry."],
  weaknesses: [],
  opportunities: [],
  threats: [],
  contracts: [{ address: "0xabc", chain: "base", ok: true, verified: true, isContract: true, proxyType: null, compilerVersion: "0.8.19", licenseType: "MIT" }],
};

function Probe({ slug }: { slug: string | null }) {
  const { data, isLoading, isError } = useCompareProjectDetail(slug);
  if (isLoading) return <span>loading</span>;
  if (isError) return <span>error</span>;
  if (!data) return <span>idle</span>;
  return <span>{data.recommendation}</span>;
}

function renderWithClient(slug: string | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Probe slug={slug} />
    </QueryClientProvider>
  );
}

describe("useCompareProjectDetail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the real per-project compare-detail route and returns its data", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => DETAIL } as Response);

    renderWithClient("aave");

    await waitFor(() => expect(screen.getByText("Suitable for Deeper Research")).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith("/api/projects/aave/compare-detail");
  });

  it("never fetches for a discovery-only project with no registry slug", () => {
    renderWithClient(null);
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports a real error state rather than silently returning stale/fabricated data when the route fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response);

    renderWithClient("compound");

    await waitFor(() => expect(screen.getByText("error")).toBeInTheDocument());
  });
});
