"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { wagmiConfig } from "@/lib/wallet/config";

/**
 * The one place `WagmiProvider`/`QueryClientProvider` are mounted — every
 * wallet hook in this app reads through this, never a second `wagmi`
 * config. Mounted in `app/layout.tsx` alongside the existing
 * `next-themes` `ThemeProvider`, the same "server layout composes a client
 * provider component directly" shape that file already establishes; this
 * doesn't restructure that composition, just adds one more sibling.
 *
 * `QueryClient` is created inside the component (`useState` initializer,
 * never module scope) so a server render never shares one client's cached
 * query state with another's — the standard React Query + Next.js App
 * Router guidance.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
