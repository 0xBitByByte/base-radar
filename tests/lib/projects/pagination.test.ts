import { describe, expect, it } from "vitest";

import { paginateLiveProjects } from "@/lib/projects/pagination";

describe("paginateLiveProjects", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it("slices the first page correctly", () => {
    const result = paginateLiveProjects(items, { page: 1, pageSize: 10 });
    expect(result.items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result.totalItems).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(false);
  });

  it("slices a middle page correctly", () => {
    const result = paginateLiveProjects(items, { page: 2, pageSize: 10 });
    expect(result.items).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(true);
  });

  it("slices the last, partial page correctly", () => {
    const result = paginateLiveProjects(items, { page: 3, pageSize: 10 });
    expect(result.items).toEqual([20, 21, 22, 23, 24]);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
  });

  it("returns an empty page (with accurate metadata) past the last real page", () => {
    const result = paginateLiveProjects(items, { page: 10, pageSize: 10 });
    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(3);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
  });

  it("handles an empty input array", () => {
    const result = paginateLiveProjects([], { page: 1, pageSize: 10 });
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(1);
  });

  it("scales to hundreds of items with a larger page size", () => {
    const many = Array.from({ length: 1200 }, (_, i) => i);
    const result = paginateLiveProjects(many, { page: 3, pageSize: 500 });
    expect(result.items).toHaveLength(200);
    expect(result.totalPages).toBe(3);
  });

  it("clamps page and pageSize to sane minimums", () => {
    const result = paginateLiveProjects(items, { page: 0, pageSize: 0 });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBeGreaterThanOrEqual(1);
  });
});
