import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clear, dequeue, enqueue, list, peek, replaceAll, retry } from "@/lib/sync/operations";
import { buildOperation, QUEUE_STORAGE_KEY } from "@/lib/sync/queue";

describe("Sync Queue semantics", () => {
  beforeEach(() => window.localStorage.removeItem(QUEUE_STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(QUEUE_STORAGE_KEY));

  it("list starts empty", () => {
    expect(list()).toEqual([]);
  });

  it("enqueue appends a real operation, preserving arrival order", () => {
    const first = buildOperation("create", "watchlist", "wl-1");
    const second = buildOperation("update", "watchlist", "wl-1");
    enqueue(first);
    enqueue(second);
    expect(list().map((op) => op.id)).toEqual([first.id, second.id]);
  });

  it("dequeue removes exactly the matching operation", () => {
    const first = buildOperation("create", "watchlist", "wl-1");
    const second = buildOperation("create", "account", "acct-1");
    enqueue(first);
    enqueue(second);
    const remaining = dequeue(first.id);
    expect(remaining).toEqual([second]);
    expect(list()).toEqual([second]);
  });

  it("dequeue on a missing id is a real no-op", () => {
    const op = buildOperation("create", "watchlist", "wl-1");
    enqueue(op);
    expect(dequeue("sync:does-not-exist")).toEqual([op]);
  });

  it("peek returns the oldest queued operation without removing it", () => {
    const first = buildOperation("create", "watchlist", "wl-1");
    const second = buildOperation("create", "watchlist", "wl-2");
    enqueue(first);
    enqueue(second);
    expect(peek()).toEqual(first);
    expect(list()).toHaveLength(2);
  });

  it("peek is null on an empty queue", () => {
    expect(peek()).toBeNull();
  });

  it("clear empties the queue", () => {
    enqueue(buildOperation("create", "watchlist", "wl-1"));
    expect(clear()).toEqual([]);
    expect(list()).toEqual([]);
  });

  it("retry bumps retryCount and resets status to pending on the matching operation only", () => {
    const target = buildOperation("create", "watchlist", "wl-1");
    const other = buildOperation("create", "watchlist", "wl-2");
    enqueue(target);
    enqueue(other);
    const next = retry(target.id);
    const updatedTarget = next.find((op) => op.id === target.id)!;
    const untouchedOther = next.find((op) => op.id === other.id)!;
    expect(updatedTarget.retryCount).toBe(1);
    expect(updatedTarget.status).toBe("pending");
    expect(untouchedOther).toEqual(other);
  });

  it("replaceAll bulk-replaces the whole queue in one write", () => {
    enqueue(buildOperation("create", "watchlist", "wl-1"));
    const replacement = [buildOperation("update", "account", "acct-1")];
    expect(replaceAll(replacement)).toEqual(replacement);
    expect(list()).toEqual(replacement);
  });
});
