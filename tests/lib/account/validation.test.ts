import { describe, expect, it } from "vitest";

import { validateAccountImport, validateAccountRecord } from "@/lib/account/validation";

function makeValidAccount() {
  return {
    id: "account:1",
    name: "Rin",
    username: "rin_dev",
    email: null,
    avatar: null,
    bio: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastActiveAt: "2026-01-01T00:00:00.000Z",
    isGuest: true,
  };
}

describe("validateAccountRecord", () => {
  it("a real, complete account record is valid with zero issues", () => {
    expect(validateAccountRecord(makeValidAccount())).toEqual({ valid: true, issues: [] });
  });

  it("null/non-object input reports the real minimum required fields as missing", () => {
    expect(validateAccountRecord(null)).toEqual({ valid: false, issues: ["missing-id", "missing-name", "missing-username"] });
    expect(validateAccountRecord("not an object")).toEqual({ valid: false, issues: ["missing-id", "missing-name", "missing-username"] });
  });

  it("reports every real issue found, not just the first", () => {
    const result = validateAccountRecord({ ...makeValidAccount(), id: "", name: "", createdAt: "not-a-date" });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("missing-id");
    expect(result.issues).toContain("missing-name");
    expect(result.issues).toContain("corrupted-created-at");
  });

  it("email/avatar/bio being a real string OR null are both valid — only a wrong type is an issue", () => {
    expect(
      validateAccountRecord({ ...makeValidAccount(), email: "rin@example.com", avatar: "https://example.com/a.png", bio: "Building on Base." })
        .valid
    ).toBe(true);
    expect(validateAccountRecord({ ...makeValidAccount(), email: 123 }).issues).toContain("invalid-email-type");
    expect(validateAccountRecord({ ...makeValidAccount(), avatar: 123 }).issues).toContain("invalid-avatar-type");
    expect(validateAccountRecord({ ...makeValidAccount(), bio: 123 }).issues).toContain("invalid-bio-type");
  });

  it("a corrupted timestamp on any of the three real timestamp fields is reported individually", () => {
    expect(validateAccountRecord({ ...makeValidAccount(), createdAt: "nope" }).issues).toContain("corrupted-created-at");
    expect(validateAccountRecord({ ...makeValidAccount(), updatedAt: "nope" }).issues).toContain("corrupted-updated-at");
    expect(validateAccountRecord({ ...makeValidAccount(), lastActiveAt: "nope" }).issues).toContain("corrupted-last-active-at");
  });

  it("a non-boolean isGuest is reported", () => {
    expect(validateAccountRecord({ ...makeValidAccount(), isGuest: "yes" }).issues).toContain("invalid-is-guest-type");
  });
});

describe("validateAccountImport", () => {
  it("genuinely malformed JSON is reported as a real parse error, not a validation issue", () => {
    const result = validateAccountImport("{not valid json");
    expect(result).toEqual({ valid: false, parseError: true, issues: [], account: null });
  });

  it("a real exportAccount()-shaped payload ({version, exportedAt, account}) is unwrapped and validated correctly", () => {
    const raw = JSON.stringify({ version: 1, exportedAt: "2026-01-01T00:00:00.000Z", account: makeValidAccount() });
    const result = validateAccountImport(raw);
    expect(result.valid).toBe(true);
    expect(result.parseError).toBe(false);
    expect(result.account?.name).toBe("Rin");
  });

  it("a bare account object (no {account} wrapper) is also accepted", () => {
    const result = validateAccountImport(JSON.stringify(makeValidAccount()));
    expect(result.valid).toBe(true);
    expect(result.account?.name).toBe("Rin");
  });

  it("a real but invalid account payload returns null account, never a partially-fabricated one", () => {
    const result = validateAccountImport(JSON.stringify({ account: { name: "" } }));
    expect(result.valid).toBe(false);
    expect(result.account).toBeNull();
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
