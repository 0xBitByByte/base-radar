// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createDatabase } from "@/lib/backend/sqlite/db";
import { CHALLENGE_TTL_MS, consumeChallenge, createChallenge } from "@/lib/backend/sqlite/challenges";

const ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";

describe("createChallenge / consumeChallenge", () => {
  it("creates a real, unique nonce with a real, future expiration", () => {
    const db = createDatabase(":memory:");
    const challenge = createChallenge(db, ADDRESS);

    expect(challenge.nonce).toMatch(/^[a-zA-Z0-9]{8,}$/);
    expect(new Date(challenge.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(challenge.expiresAt).getTime() - new Date(challenge.issuedAt).getTime()).toBe(CHALLENGE_TTL_MS);
    db.close();
  });

  it("normalizes the address to lowercase for consistent lookup", () => {
    const db = createDatabase(":memory:");
    const challenge = createChallenge(db, ADDRESS);
    expect(challenge.address).toBe(ADDRESS.toLowerCase());
    db.close();
  });

  it("a valid, unexpired, unconsumed challenge for the right address consumes successfully", () => {
    const db = createDatabase(":memory:");
    const challenge = createChallenge(db, ADDRESS);
    const result = consumeChallenge(db, challenge.nonce, ADDRESS);
    expect(result).toEqual({ outcome: "valid", address: ADDRESS.toLowerCase() });
    db.close();
  });

  it("a nonexistent nonce fails as not-found", () => {
    const db = createDatabase(":memory:");
    const result = consumeChallenge(db, "not-a-real-nonce", ADDRESS);
    expect(result).toEqual({ outcome: "not-found" });
    db.close();
  });

  it("replay: consuming the same real nonce a second time fails as already-consumed", () => {
    const db = createDatabase(":memory:");
    const challenge = createChallenge(db, ADDRESS);
    expect(consumeChallenge(db, challenge.nonce, ADDRESS).outcome).toBe("valid");
    const replay = consumeChallenge(db, challenge.nonce, ADDRESS);
    expect(replay).toEqual({ outcome: "already-consumed" });
    db.close();
  });

  it("a genuinely expired challenge fails as expired, never silently accepted", () => {
    const db = createDatabase(":memory:");
    const challenge = createChallenge(db, ADDRESS);
    // Force real expiry by rewriting the row's own expires_at into the past
    // — a real DB state a client can never fabricate from outside.
    db.prepare("UPDATE auth_challenges SET expires_at = ? WHERE nonce = ?").run(
      new Date(Date.now() - 1000).toISOString(),
      challenge.nonce
    );
    const result = consumeChallenge(db, challenge.nonce, ADDRESS);
    expect(result).toEqual({ outcome: "expired" });
    db.close();
  });

  it("a real nonce presented for a different address fails as address-mismatch", () => {
    const db = createDatabase(":memory:");
    const challenge = createChallenge(db, ADDRESS);
    const otherAddress = "0x0000000000000000000000000000000000dEaD";
    const result = consumeChallenge(db, challenge.nonce, otherAddress);
    expect(result).toEqual({ outcome: "address-mismatch" });
    db.close();
  });

  it("two challenges for the same address stay genuinely independent", () => {
    const db = createDatabase(":memory:");
    const first = createChallenge(db, ADDRESS);
    const second = createChallenge(db, ADDRESS);
    expect(first.nonce).not.toBe(second.nonce);

    expect(consumeChallenge(db, first.nonce, ADDRESS).outcome).toBe("valid");
    // Consuming the first must never affect the second's own real state.
    expect(consumeChallenge(db, second.nonce, ADDRESS).outcome).toBe("valid");
    db.close();
  });
});
