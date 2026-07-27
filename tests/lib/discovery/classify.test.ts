import { describe, expect, it } from "vitest";

import { classifyCandidate } from "@/lib/discovery/classify";
import { candidate } from "./fixtures";

describe("classifyCandidate", () => {
  it("classifies via a real DefiLlama category with high confidence", () => {
    const result = classifyCandidate(candidate({ source: "defillama", displayName: "Random Protocol", providerMetadata: { category: "Dexes" } }));
    expect(result.category).toBe("dex");
    expect(result.method).toBe("defillama-category");
    expect(result.confidence).toBe("high");
    expect(result.evidence).toBe("Dexes");
  });

  it("maps DefiLlama lending category correctly", () => {
    const result = classifyCandidate(candidate({ source: "defillama", displayName: "Random Money Market", providerMetadata: { category: "Lending" } }));
    expect(result.category).toBe("lending");
  });

  it("falls back to a name keyword when no DefiLlama category is present", () => {
    const result = classifyCandidate(candidate({ source: "coingecko", displayName: "SuperBridge Protocol" }));
    expect(result.category).toBe("bridge");
    expect(result.method).toBe("name-keyword");
    expect(result.confidence).toBe("medium");
  });

  it("classifies an AI-named project and attaches the ai-agents tag", () => {
    const result = classifyCandidate(candidate({ displayName: "Autonomous Agent Protocol" }));
    expect(result.category).toBe("ai");
    expect(result.tags).toContain("ai-agents");
  });

  it("classifies a meme-styled name", () => {
    const result = classifyCandidate(candidate({ displayName: "Base Pepe" }));
    expect(result.category).toBe("meme");
    expect(result.tags).toContain("memecoin");
  });

  it("falls back to 'other' with low confidence when nothing matches", () => {
    const result = classifyCandidate(candidate({ displayName: "Xyzzy Plugh Corp" }));
    expect(result.category).toBe("other");
    expect(result.confidence).toBe("low");
    expect(result.method).toBe("unclassified");
  });

  it("is deterministic — the same candidate always classifies identically", () => {
    const input = candidate({ displayName: "Yield Vault Finance" });
    const first = classifyCandidate(input);
    const second = classifyCandidate(input);
    expect(first).toEqual(second);
  });

  it("ignores an unrecognized DefiLlama category string rather than guessing", () => {
    const result = classifyCandidate(candidate({ source: "defillama", displayName: "Mystery Protocol", providerMetadata: { category: "Some Brand New Category" } }));
    expect(result.method).not.toBe("defillama-category");
  });
});
