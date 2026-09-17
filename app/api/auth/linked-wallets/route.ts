/**
 * PR-093.05 (Connected Accounts) — list and link real, additional wallets
 * for the currently-authenticated account. Both methods require a real,
 * validated session (`resolveRequestSession`) — never a client-supplied
 * account id — the same boundary every other account-scoped route in this
 * app already enforces.
 *
 * `POST` mirrors `/api/auth/verify`'s own real verification order exactly
 * (cheapest structural checks first, the real cryptographic signature
 * check last, never skipped, never the sole gate) — the only difference is
 * what happens after verification succeeds: `/api/auth/verify` creates or
 * resolves an account for the address; this route links the
 * already-verified address to the account the caller is already
 * authenticated as.
 */

import { NextResponse, type NextRequest } from "next/server";
import type { Hex } from "viem";
import { parseSiweMessage } from "viem/siwe";

import { validateChallengeMessageFields, verifySiweSignature } from "@/lib/auth/siwe";
import { consumeChallenge } from "@/lib/backend/sqlite/challenges";
import { getDb } from "@/lib/backend/sqlite/db";
import { linkWalletToAccount, listLinkedWallets, type LinkWalletOutcome } from "@/lib/backend/sqlite/linkedWallets";
import { resolveRequestSession } from "@/lib/auth/request-session";

const SIGNATURE_PATTERN = /^0x[a-fA-F0-9]+$/;

const CHALLENGE_FAILURE_MESSAGES: Record<string, string> = {
  "not-found": "Unknown link request. Please try again.",
  "already-consumed": "This link request has already been used. Please try again.",
  expired: "This link request has expired. Please try again.",
  "address-mismatch": "This link request doesn't match the connecting wallet.",
};

const LINK_OUTCOME_MESSAGES: Partial<Record<LinkWalletOutcome["outcome"], string>> = {
  "is-your-own-primary-wallet": "That's already your primary wallet.",
  "already-linked-to-you": "That wallet is already linked to your account.",
  "is-another-accounts-primary-wallet": "That wallet already belongs to a different Base Radar account.",
  "already-linked-to-another-account": "That wallet is already linked to a different Base Radar account.",
};

export async function GET(request: NextRequest) {
  const session = resolveRequestSession(request);
  if (session.state !== "authenticated") {
    return NextResponse.json({ error: "Sign in to view linked wallets." }, { status: 401 });
  }

  const db = getDb();
  return NextResponse.json({ linkedWallets: listLinkedWallets(db, session.account.id) });
}

export async function POST(request: NextRequest) {
  const session = resolveRequestSession(request);
  if (session.state !== "authenticated") {
    return NextResponse.json({ error: "Sign in to link a wallet." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { message, signature } = (body ?? {}) as { message?: unknown; signature?: unknown };

  if (typeof message !== "string" || message.trim() === "") {
    return NextResponse.json({ error: "A signed message is required." }, { status: 400 });
  }
  if (typeof signature !== "string" || !SIGNATURE_PATTERN.test(signature)) {
    return NextResponse.json({ error: "A valid signature is required." }, { status: 400 });
  }

  const parsed = parseSiweMessage(message);
  if (!parsed.address || !parsed.nonce) {
    return NextResponse.json({ error: "Malformed link message." }, { status: 400 });
  }

  const domain = request.headers.get("host") ?? "localhost";
  const fieldsValid = validateChallengeMessageFields({ message, address: parsed.address, domain, nonce: parsed.nonce });
  if (!fieldsValid) {
    return NextResponse.json({ error: "This link request is invalid or has expired." }, { status: 401 });
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

  const result = linkWalletToAccount(db, session.account.id, parsed.address);
  if (result.outcome !== "linked") {
    return NextResponse.json({ error: LINK_OUTCOME_MESSAGES[result.outcome] }, { status: 409 });
  }

  return NextResponse.json({ wallet: result.wallet, linkedWallets: listLinkedWallets(db, session.account.id) });
}
