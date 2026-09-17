/**
 * PR-093.05 (Connected Accounts) — unlink a real wallet from the
 * currently-authenticated account. No re-signature is required to unlink
 * (unlike linking): removing something already-proven from your own
 * account only needs proof you *are* that account (the real session), the
 * same standard every other account-scoped mutation in this app already
 * uses (e.g. editing Bio never re-asks for a wallet signature either).
 *
 * Structurally cannot unlink a primary wallet: `linked_wallets` never
 * contains an account's own primary address (see
 * `lib/backend/sqlite/linkedWallets.ts`'s own doc comment) — there is
 * nothing here that could ever delete the identity a session is anchored
 * to, not just a UI guard against it.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/lib/backend/sqlite/db";
import { listLinkedWallets, unlinkWalletFromAccount } from "@/lib/backend/sqlite/linkedWallets";
import { resolveRequestSession } from "@/lib/auth/request-session";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const session = resolveRequestSession(request);
  if (session.state !== "authenticated") {
    return NextResponse.json({ error: "Sign in to manage linked wallets." }, { status: 401 });
  }

  const { address } = await params;
  const db = getDb();
  const result = unlinkWalletFromAccount(db, session.account.id, address);

  if (result.outcome === "not-found") {
    return NextResponse.json({ error: "That wallet isn't linked to your account." }, { status: 404 });
  }

  return NextResponse.json({ linkedWallets: listLinkedWallets(db, session.account.id) });
}
