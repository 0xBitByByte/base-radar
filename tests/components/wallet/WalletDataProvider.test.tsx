import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";

import { useWalletData } from "@/components/wallet/WalletDataProvider";

describe("useWalletData — outside a <WalletDataProvider>", () => {
  it("throws a clear error rather than silently rendering with missing data", () => {
    expect(() => renderHook(() => useWalletData())).toThrow("useWalletData() must be called within a <WalletDataProvider>.");
  });
});
