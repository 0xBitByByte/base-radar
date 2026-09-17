// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { getDb, resetDbSingletonForTests } from "@/lib/backend/sqlite/db";
import { createSession } from "@/lib/backend/sqlite/sessions";
import { linkWalletToAccount, listLinkedWallets } from "@/lib/backend/sqlite/linkedWallets";
import { DELETE } from "@/app/api/auth/linked-wallets/[address]/route";

const PRIMARY_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const OTHER_PRIMARY_ADDRESS = "0x0000000000000000000000000000000000dEaD";
const LINKED_ADDRESS = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf1";

function deleteRequest(address: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000/api/auth/linked-wallets/${address}`, {
    method: "DELETE",
    headers: cookie ? { cookie } : {},
  });
}

describe("DELETE /api/auth/linked-wallets/[address]", () => {
  beforeEach(() => {
    process.env.SQLITE_DB_PATH = ":memory:";
    resetDbSingletonForTests();
  });
  afterEach(() => {
    resetDbSingletonForTests();
    delete process.env.SQLITE_DB_PATH;
  });

  it("requires a real session", async () => {
    const response = await DELETE(deleteRequest(LINKED_ADDRESS), { params: Promise.resolve({ address: LINKED_ADDRESS }) });
    expect(response.status).toBe(401);
  });

  it("unlinks a real wallet genuinely linked to the authenticated account, no re-signature required", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const session = createSession(db, account.id);
    linkWalletToAccount(db, account.id, LINKED_ADDRESS);

    const response = await DELETE(deleteRequest(LINKED_ADDRESS, `br_session=${session.id}`), {
      params: Promise.resolve({ address: LINKED_ADDRESS }),
    });
    expect(response.status).toBe(200);
    expect(listLinkedWallets(db, account.id)).toEqual([]);
  });

  it("a real 404 for a wallet that was never linked, rather than a fabricated success", async () => {
    const db = getDb();
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    const session = createSession(db, account.id);

    const response = await DELETE(deleteRequest(LINKED_ADDRESS, `br_session=${session.id}`), {
      params: Promise.resolve({ address: LINKED_ADDRESS }),
    });
    expect(response.status).toBe(404);
  });

  it("never lets one authenticated account unlink a wallet genuinely linked to a different account", async () => {
    const db = getDb();
    const accountA = createAccountForAddress(db, PRIMARY_ADDRESS);
    const accountB = createAccountForAddress(db, OTHER_PRIMARY_ADDRESS);
    const sessionB = createSession(db, accountB.id);
    linkWalletToAccount(db, accountA.id, LINKED_ADDRESS);

    const response = await DELETE(deleteRequest(LINKED_ADDRESS, `br_session=${sessionB.id}`), {
      params: Promise.resolve({ address: LINKED_ADDRESS }),
    });
    expect(response.status).toBe(404);
    expect(listLinkedWallets(db, accountA.id)).toHaveLength(1); // untouched
  });
});
