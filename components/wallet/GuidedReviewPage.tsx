"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Wallet } from "lucide-react";

import { WalletDataProvider, useWalletData } from "@/components/wallet/WalletDataProvider";
import { useGuidedReview } from "@/lib/hooks/useGuidedReview";
import { WalletButton } from "@/components/wallet/WalletButton";
import { GuidedPortfolioReview } from "@/components/wallet/GuidedPortfolioReview";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * V4-FUTURE-002 (Feature 6 — Guided Portfolio Review) — the page-level
 * wrapper: composes the SAME hooks `WalletPortfolioPage.tsx` already
 * composes (never a second holdings/intelligence/analytics fetch path),
 * and hands their outputs straight to `GuidedPortfolioReview`, which does
 * the actual step rendering. Same connect/network gating convention as
 * `WalletPortfolioPage.tsx`.
 *
 * V4-FUTURE-002C — wraps in `<WalletDataProvider>`, the same shared
 * context `WalletPortfolioPage.tsx` uses, instead of independently
 * re-composing the full hook chain a second time. `useGuidedReview()`
 * stays a direct, local call — its own progress state, not a shared
 * already-built object.
 */
export function GuidedReviewPage() {
  return (
    <WalletDataProvider>
      <GuidedReviewPageBody />
    </WalletDataProvider>
  );
}

function GuidedReviewPageBody() {
  const { isConnected, isSupportedNetwork, portfolio, intelligence, ai, automation, analytics, walletHistory, digest, story } = useWalletData();
  const review = useGuidedReview();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/wallet"
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to Wallet
      </Link>

      {!isConnected ? (
        <EmptyState icon={Wallet} title="No wallet connected" description="Connect your wallet to start a guided review of your real holdings." action={<WalletButton />} className="py-12" />
      ) : !isSupportedNetwork ? (
        <EmptyState icon={AlertTriangle} title="Unsupported network" description="Switch your wallet to Base Mainnet or Base Sepolia to continue." className="py-12" />
      ) : !portfolio.chainSupported ? (
        <EmptyState icon={AlertTriangle} title="Base Sepolia not yet supported" description="Guided Review currently only supports Base Mainnet." className="py-12" />
      ) : (
        <GuidedPortfolioReview review={review} intelligence={intelligence} ai={ai} automation={automation} analytics={analytics} walletHistory={walletHistory} highlights={analytics.highlights} digest={digest} story={story} />
      )}
    </div>
  );
}
