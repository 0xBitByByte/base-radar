// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createAccountForAddress } from "@/lib/backend/sqlite/accounts";
import { createDatabase } from "@/lib/backend/sqlite/db";
import { linkWalletToAccount, listLinkedWallets, unlinkWalletFromAccount } from "@/lib/backend/sqlite/linkedWallets";

const PRIMARY_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const OTHER_PRIMARY_ADDRESS = "0x0000000000000000000000000000000000dEaD";
const SECOND_WALLET_ADDRESS = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf1";

describe("listLinkedWallets", () => {
  it("starts empty for a real, freshly-created account", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    expect(listLinkedWallets(db, account.id)).toEqual([]);
    db.close();
  });
});

describe("linkWalletToAccount", () => {
  it("links a real, genuinely new address to the account", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);

    const result = linkWalletToAccount(db, account.id, SECOND_WALLET_ADDRESS);
    expect(result.outcome).toBe("linked");
    expect(listLinkedWallets(db, account.id).map((w) => w.address)).toEqual([SECOND_WALLET_ADDRESS.toLowerCase()]);
    db.close();
  });

  it("normalizes the address to lowercase, matching every other address comparison in this backend", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);

    const result = linkWalletToAccount(db, account.id, SECOND_WALLET_ADDRESS.toUpperCase());
    expect(result.outcome).toBe("linked");
    if (result.outcome === "linked") expect(result.wallet.address).toBe(SECOND_WALLET_ADDRESS.toLowerCase());
    db.close();
  });

  it("refuses to link an account's own real primary wallet to itself", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);

    const result = linkWalletToAccount(db, account.id, PRIMARY_ADDRESS);
    expect(result.outcome).toBe("is-your-own-primary-wallet");
    expect(listLinkedWallets(db, account.id)).toEqual([]);
    db.close();
  });

  it("refuses to link the same real wallet twice, reporting it's already linked to you", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    linkWalletToAccount(db, account.id, SECOND_WALLET_ADDRESS);

    const result = linkWalletToAccount(db, account.id, SECOND_WALLET_ADDRESS);
    expect(result.outcome).toBe("already-linked-to-you");
    expect(listLinkedWallets(db, account.id)).toHaveLength(1);
    db.close();
  });

  it("refuses to link a real wallet that's already linked to a different real account", () => {
    const db = createDatabase(":memory:");
    const accountA = createAccountForAddress(db, PRIMARY_ADDRESS);
    const accountB = createAccountForAddress(db, OTHER_PRIMARY_ADDRESS);
    linkWalletToAccount(db, accountA.id, SECOND_WALLET_ADDRESS);

    const result = linkWalletToAccount(db, accountB.id, SECOND_WALLET_ADDRESS);
    expect(result.outcome).toBe("already-linked-to-another-account");
    expect(listLinkedWallets(db, accountB.id)).toEqual([]);
    db.close();
  });

  it("refuses to link a real wallet that is a DIFFERENT account's real primary wallet — never merges identities", () => {
    const db = createDatabase(":memory:");
    const accountA = createAccountForAddress(db, PRIMARY_ADDRESS);
    createAccountForAddress(db, OTHER_PRIMARY_ADDRESS); // OTHER_PRIMARY_ADDRESS is its own account's real primary

    const result = linkWalletToAccount(db, accountA.id, OTHER_PRIMARY_ADDRESS);
    expect(result.outcome).toBe("is-another-accounts-primary-wallet");
    expect(listLinkedWallets(db, accountA.id)).toEqual([]);
    db.close();
  });
});

describe("unlinkWalletFromAccount", () => {
  it("removes a real linked wallet that genuinely belongs to this account", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);
    linkWalletToAccount(db, account.id, SECOND_WALLET_ADDRESS);

    const result = unlinkWalletFromAccount(db, account.id, SECOND_WALLET_ADDRESS);
    expect(result.outcome).toBe("unlinked");
    expect(listLinkedWallets(db, account.id)).toEqual([]);
    db.close();
  });

  it("is a real, honest no-op for a wallet that was never linked", () => {
    const db = createDatabase(":memory:");
    const account = createAccountForAddress(db, PRIMARY_ADDRESS);

    const result = unlinkWalletFromAccount(db, account.id, SECOND_WALLET_ADDRESS);
    expect(result.outcome).toBe("not-found");
    db.close();
  });

  it("never lets one real account unlink a wallet genuinely linked to a different account", () => {
    const db = createDatabase(":memory:");
    const accountA = createAccountForAddress(db, PRIMARY_ADDRESS);
    const accountB = createAccountForAddress(db, OTHER_PRIMARY_ADDRESS);
    linkWalletToAccount(db, accountA.id, SECOND_WALLET_ADDRESS);

    const result = unlinkWalletFromAccount(db, accountB.id, SECOND_WALLET_ADDRESS);
    expect(result.outcome).toBe("not-found");
    expect(listLinkedWallets(db, accountA.id)).toHaveLength(1); // untouched
    db.close();
  });
});
