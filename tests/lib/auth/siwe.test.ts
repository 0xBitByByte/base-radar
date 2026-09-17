// @vitest-environment node
import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

import { buildChallengeMessage, validateChallengeMessageFields, verifySiweSignature } from "@/lib/auth/siwe";

const DOMAIN = "baseradar.test";
const URI = "https://baseradar.test";

function realWallet() {
  const privateKey = generatePrivateKey();
  return privateKeyToAccount(privateKey);
}

function realChallenge(address: string, nonce = "realnonceabc123xyz") {
  const issuedAt = new Date();
  const expirationTime = new Date(issuedAt.getTime() + 5 * 60 * 1000);
  const message = buildChallengeMessage({ address, domain: DOMAIN, uri: URI, nonce, issuedAt, expirationTime });
  return { message, nonce, issuedAt, expirationTime };
}

describe("buildChallengeMessage", () => {
  it("produces a real EIP-4361 message containing every real field", () => {
    const wallet = realWallet();
    const { message } = realChallenge(wallet.address);

    expect(message).toContain(DOMAIN);
    expect(message).toContain(wallet.address);
    expect(message).toContain("realnonceabc123xyz");
    expect(message).toContain("Sign in to Base Radar");
  });

  it("throws on a genuinely malformed address, never silently builds a message for it", () => {
    expect(() => realChallenge("not-a-real-address")).toThrow();
  });
});

describe("validateChallengeMessageFields", () => {
  it("a real, matching message/address/domain/nonce validates", () => {
    const wallet = realWallet();
    const { message, nonce } = realChallenge(wallet.address);

    expect(validateChallengeMessageFields({ message, address: wallet.address, domain: DOMAIN, nonce })).toBe(true);
  });

  it("rejects a mismatched domain — a genuine phishing-relay defense, not decorative", () => {
    const wallet = realWallet();
    const { message, nonce } = realChallenge(wallet.address);

    expect(validateChallengeMessageFields({ message, address: wallet.address, domain: "attacker.test", nonce })).toBe(false);
  });

  it("rejects a mismatched nonce", () => {
    const wallet = realWallet();
    const { message } = realChallenge(wallet.address);

    expect(validateChallengeMessageFields({ message, address: wallet.address, domain: DOMAIN, nonce: "wrong-nonce" })).toBe(false);
  });

  it("rejects a mismatched address", () => {
    const wallet = realWallet();
    const other = realWallet();
    const { message, nonce } = realChallenge(wallet.address);

    expect(validateChallengeMessageFields({ message, address: other.address, domain: DOMAIN, nonce })).toBe(false);
  });
});

describe("verifySiweSignature — real cryptographic verification, never mocked", () => {
  it("a real signature from the real claimed address verifies true", async () => {
    const wallet = realWallet();
    const { message } = realChallenge(wallet.address);
    const signature = await wallet.signMessage({ message });

    expect(await verifySiweSignature(message, signature, wallet.address)).toBe(true);
  });

  it("a real signature from a DIFFERENT real wallet fails verification against the claimed address", async () => {
    const wallet = realWallet();
    const impostor = realWallet();
    const { message } = realChallenge(wallet.address);
    const impostorSignature = await impostor.signMessage({ message });

    expect(await verifySiweSignature(message, impostorSignature, wallet.address)).toBe(false);
  });

  it("a real signature over a DIFFERENT message fails verification — proves the message content is actually bound to the signature, not just its shape", async () => {
    const wallet = realWallet();
    const { message } = realChallenge(wallet.address);
    const tamperedMessage = message.replace("Sign in to Base Radar", "Sign in to Evil Radar");
    const signature = await wallet.signMessage({ message });

    expect(await verifySiweSignature(tamperedMessage, signature, wallet.address)).toBe(false);
  });

  it("a genuinely malformed/garbage signature fails verification rather than throwing an unhandled error", async () => {
    const wallet = realWallet();
    const { message } = realChallenge(wallet.address);

    await expect(verifySiweSignature(message, "0xnotarealsignature" as Hex, wallet.address)).resolves.toBe(false);
  });
});
