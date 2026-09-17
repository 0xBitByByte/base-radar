/**
 * Step 1 of real SIWE sign-in: issues a real, server-stored, single-use,
 * short-lived nonce and the exact EIP-4361 message the wallet is asked to
 * sign — the "generate a server-verifiable challenge/nonce" requirement.
 * Never accepts or trusts anything beyond the address to challenge; never
 * returns anything that would let a client skip signing.
 */

import { NextResponse, type NextRequest } from "next/server";

import { buildChallengeMessage } from "@/lib/auth/siwe";
import { createChallenge } from "@/lib/backend/sqlite/challenges";
import { getDb } from "@/lib/backend/sqlite/db";
import { isRequestRateLimited } from "@/lib/security/requestRateLimit";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

// PR-097.05 (Security): unauthenticated and DB-writing (one real
// `auth_challenges` row per call) — a real abuse target with no session to
// charge the cost to. 20 requests / 5 minutes per IP comfortably covers a
// real user retrying a rejected wallet-signing prompt several times, while
// bounding how fast one IP can grow this table.
const CHALLENGE_RATE_LIMIT = { limit: 20, windowMs: 5 * 60 * 1000 };

export async function POST(request: NextRequest) {
  if (isRequestRateLimited(request, "auth:challenge", CHALLENGE_RATE_LIMIT)) {
    return NextResponse.json({ error: "Too many sign-in requests. Please try again in a few minutes." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const address = (body as { address?: unknown } | null)?.address;
  if (typeof address !== "string" || !ADDRESS_PATTERN.test(address)) {
    return NextResponse.json({ error: "A valid wallet address is required." }, { status: 400 });
  }

  const db = getDb();
  const challenge = createChallenge(db, address);
  const domain = request.headers.get("host") ?? "localhost";

  let message: string;
  try {
    message = buildChallengeMessage({
      address,
      domain,
      uri: request.nextUrl.origin,
      nonce: challenge.nonce,
      issuedAt: new Date(challenge.issuedAt),
      expirationTime: new Date(challenge.expiresAt),
    });
  } catch {
    return NextResponse.json({ error: "That address isn't a valid Ethereum address." }, { status: 400 });
  }

  return NextResponse.json({ message, nonce: challenge.nonce, expiresAt: challenge.expiresAt });
}
