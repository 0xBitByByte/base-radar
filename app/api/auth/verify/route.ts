/**
 * Step 2 of real SIWE sign-in — the only place a connected wallet address
 * actually becomes an authenticated identity. Every step below is a real
 * check that can genuinely fail; a bare wallet address is never, on its
 * own, treated as proof of anything:
 *
 * 1. The signed message's own fields (address, domain, nonce, expiration)
 *    must structurally validate.
 * 2. The referenced nonce must be a real, unconsumed, unexpired challenge
 *    this server actually issued for this address — consumed atomically
 *    here, so the same nonce can never succeed twice (real replay
 *    prevention).
 * 3. The signature must cryptographically verify against the claimed
 *    address (`lib/auth/siwe.ts`'s `verifySiweSignature`) — real ECDSA
 *    recovery, not a format check.
 *
 * Only after all three succeed does this route touch `users`/`accounts`,
 * create a real server-side session, and set the httpOnly cookie.
 */

import { NextResponse, type NextRequest } from "next/server";
import type { Hex } from "viem";
import { parseSiweMessage } from "viem/siwe";

import { validateChallengeMessageFields, verifySiweSignature } from "@/lib/auth/siwe";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/cookie";
import { consumeChallenge } from "@/lib/backend/sqlite/challenges";
import { createAccountForAddress, findAccountByAddress, touchAccountLastActive } from "@/lib/backend/sqlite/accounts";
import { bootstrapAccountFromGuestSnapshot, isValidGuestSnapshot, recordAccountConflict } from "@/lib/backend/sqlite/bootstrap";
import { getDb } from "@/lib/backend/sqlite/db";
import { createSession, SESSION_TTL_MS } from "@/lib/backend/sqlite/sessions";

const SIGNATURE_PATTERN = /^0x[a-fA-F0-9]+$/;

const CHALLENGE_FAILURE_MESSAGES: Record<string, string> = {
  "not-found": "Unknown sign-in request. Please try again.",
  "already-consumed": "This sign-in request has already been used. Please try again.",
  expired: "This sign-in request has expired. Please try again.",
  "address-mismatch": "This sign-in request doesn't match the connecting wallet.",
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { message, signature, guestSnapshot } = (body ?? {}) as { message?: unknown; signature?: unknown; guestSnapshot?: unknown };

  if (typeof message !== "string" || message.trim() === "") {
    return NextResponse.json({ error: "A signed message is required." }, { status: 400 });
  }
  if (typeof signature !== "string" || !SIGNATURE_PATTERN.test(signature)) {
    return NextResponse.json({ error: "A valid signature is required." }, { status: 400 });
  }

  const parsed = parseSiweMessage(message);
  if (!parsed.address || !parsed.nonce) {
    return NextResponse.json({ error: "Malformed sign-in message." }, { status: 400 });
  }

  const domain = request.headers.get("host") ?? "localhost";
  const fieldsValid = validateChallengeMessageFields({ message, address: parsed.address, domain, nonce: parsed.nonce });
  if (!fieldsValid) {
    return NextResponse.json({ error: "This sign-in request is invalid or has expired." }, { status: 401 });
  }

  const db = getDb();
  const challengeResult = consumeChallenge(db, parsed.nonce, parsed.address);
  if (challengeResult.outcome !== "valid") {
    return NextResponse.json({ error: CHALLENGE_FAILURE_MESSAGES[challengeResult.outcome] }, { status: 401 });
  }

  // The cryptographic check happens last, after every cheaper structural
  // check has already passed — never the sole gate, and never skipped.
  const signatureValid = await verifySiweSignature(message, signature as Hex, parsed.address);
  if (!signatureValid) {
    return NextResponse.json({ error: "Signature verification failed." }, { status: 401 });
  }

  const address = parsed.address.toLowerCase();
  const snapshot = isValidGuestSnapshot(guestSnapshot) ? guestSnapshot : null;

  let account = findAccountByAddress(db, address);
  let migration: { status: "none" | "migrated" | "conflict"; watchlistsMigrated?: number } = { status: "none" };

  if (!account) {
    account = createAccountForAddress(db, address, snapshot?.account ?? {});
    if (snapshot) {
      const result = bootstrapAccountFromGuestSnapshot(db, account.id, snapshot);
      migration = { status: "migrated", watchlistsMigrated: result.watchlistsMigrated };
    }
  } else {
    touchAccountLastActive(db, account.id);
    if (snapshot && (snapshot.watchlists.length > 0 || snapshot.account.name.trim() !== "")) {
      recordAccountConflict(db, account.id, snapshot, { account });
      migration = { status: "conflict" };
    }
  }

  const session = createSession(db, account.id);

  const response = NextResponse.json({ account, migration });
  response.cookies.set(SESSION_COOKIE_NAME, session.id, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return response;
}
