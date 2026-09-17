"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { AlertTriangle, Check, Copy, ExternalLink, Loader2, LogOut, Wallet } from "lucide-react";
import { base, baseSepolia } from "viem/chains";

import { cn } from "@/lib/utils";
import { useConnectorAvailability } from "@/lib/hooks/useConnectorAvailability";
import { useWallet } from "@/lib/hooks/useWallet";
import { getWalletExplorerAddressUrl } from "@/lib/wallet/chains";
import { CONNECTOR_ICON_SRC } from "@/lib/wallet/connectorIcons";
import { CONNECTOR_METADATA } from "@/lib/wallet/connectors";
import { shortenAddress } from "@/lib/wallet/format";
import { ChainBadge } from "@/components/branding/ChainBadge";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { Tooltip } from "@/components/ui/Tooltip";

const TRIGGER_CLASS =
  "flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-medium whitespace-nowrap outline-none transition-colors xl:px-3 min-[1440px]:px-3 focus-visible:ring-2 focus-visible:ring-radar-primary/50";

const MENU_POPUP_CLASS = cn(
  "min-w-[240px] max-w-[280px] rounded-2xl border border-radar-light-border bg-radar-light-card/95 p-1.5 shadow-xl backdrop-blur-xl outline-none dark:border-white/10 dark:bg-radar-card/95",
  "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
  "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
);

const MENU_ITEM_CLASS =
  "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface data-[highlighted]:text-radar-light-text dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white";

/**
 * The one shared connector-icon renderer — the picker (`ConnectMenu`) and
 * the connected trigger (`AccountMenuTrigger`) both call this, so any
 * future connector badge reuses the exact same lookup instead of a third
 * copy. Three-tier fallback: a real runtime `connector.icon` (the data:
 * URI a genuinely-installed EIP-6963 wallet announces itself — confirmed
 * live this only exists for a real detected extension, never for the
 * static MetaMask/Coinbase Wallet/WalletConnect targets configured in
 * `lib/wallet/config.ts`) wins when present; otherwise
 * `CONNECTOR_ICON_SRC` (`lib/wallet/connectorIcons.tsx`) supplies each
 * connector's official brand asset from `/public/wallets/` by its real
 * `id` — every configured connector has a real entry there as of
 * V3-WALLET-001E; the generic `Wallet` glyph is now purely a defensive
 * last resort (an unrecognized future connector id), not an expected
 * steady-state for any wallet in the current picker. `size-4` (16px)
 * matches every other Menu.Item icon in
 * this exact menu style (`Copy`/`ExternalLink`/`LogOut` below, and
 * `AccountMenu.tsx`'s own items) — deliberately not the 24px a generic
 * wallet-picker might default to, since this app's own icon convention
 * already exists and takes priority.
 */
function ConnectorIcon({ id, icon }: { id: string; icon: string | undefined }) {
  if (icon) {
    // eslint-disable-next-line @next/next/no-img-element -- a wallet-supplied data: URI, not an optimizable static asset.
    return <img src={icon} alt="" className="size-4 shrink-0 rounded-sm" aria-hidden="true" />;
  }
  const brandIconSrc = CONNECTOR_ICON_SRC[id];
  if (brandIconSrc) {
    // eslint-disable-next-line @next/next/no-img-element -- a small static brand mark under /public/wallets/, not a candidate for next/image's optimization pipeline.
    return <img src={brandIconSrc} alt="" className="size-4 shrink-0 object-contain" aria-hidden="true" />;
  }
  return <Wallet className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />;
}

/**
 * "Installed"/"Not Installed" — `available` is `null` until
 * `useConnectorAvailability` resolves past its initial unknown state
 * (avoids a hydration mismatch and avoids ever guessing), and for
 * connectors `CONNECTOR_METADATA` gives no real `providerFlag` to check;
 * both render nothing. The negative case is gated further by
 * `showNotInstalled` (`ConnectorRow` passes `Boolean(metadata?.installUrl)`
 * — see that file's own doc comment): Coinbase Wallet now DOES have a real
 * `providerFlag` (`isCoinbaseWallet`) so its extension being present is
 * still shown as "Installed" — a genuinely useful signal, since it means
 * the extension gets used directly instead of the SDK's popup fallback —
 * but showing "Not Installed" for it (or WalletConnect) would be a false
 * negative: both connect successfully with nothing installed, so absence
 * isn't a real "not installed" state for them the way it is for
 * MetaMask/Rabby/Trust Wallet.
 */
function AvailabilityBadge({ available, showNotInstalled }: { available: boolean | null; showNotInstalled: boolean }) {
  if (available === null) return null;
  if (available === false && !showNotInstalled) return null;

  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold whitespace-nowrap uppercase",
        available
          ? "border-radar-success/30 bg-radar-success/10 text-radar-success"
          : "border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/5 dark:text-radar-muted"
      )}
    >
      {available ? "Installed" : "Not Installed"}
    </span>
  );
}

/**
 * One connector row in the picker — icon, name + short description, and an
 * availability hint on the right. Shared by nothing else today, but
 * factored out (rather than inlined in the `.map`) so a future connector
 * badge elsewhere can reuse it directly. `available` is resolved once by
 * the caller (`ConnectorMenuItem`) and threaded down here rather than
 * re-derived — this row and the caller's own link-vs-connect branch both
 * need the same value, and a row-level `useConnectorAvailability` call
 * would just recompute it a second time.
 */
function ConnectorRow({
  id,
  name,
  icon,
  available,
}: {
  id: string;
  name: string;
  icon: string | undefined;
  available: boolean | null;
}) {
  const metadata = CONNECTOR_METADATA[id];

  return (
    <>
      <ConnectorIcon id={id} icon={icon} />
      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="truncate">{name}</span>
        {metadata?.description && (
          <span className="truncate text-[10.5px] font-normal text-radar-light-muted dark:text-radar-muted">
            {metadata.description}
          </span>
        )}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1">
        <AvailabilityBadge available={available} showNotInstalled={Boolean(metadata?.installUrl)} />
        {/* V3-WALLET-001H — only shown once we've genuinely confirmed the
            wallet is absent AND it has a real install page to send someone
            to (`CONNECTOR_METADATA`'s `installUrl` — Coinbase Wallet/
            WalletConnect never set it, since neither needs it). Tells the
            same story `ConnectorMenuItem` below acts on: clicking this row
            opens a new tab instead of attempting a doomed `connect()`. */}
        {available === false && metadata?.installUrl && (
          <ExternalLink className="size-3 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        )}
      </span>
    </>
  );
}

/**
 * One connector entry in the picker. Normally a click attempts to connect —
 * but once `useConnectorAvailability` has confirmed a browser-extension-only
 * wallet (MetaMask/Rabby/Trust Wallet) is genuinely absent, clicking it used
 * to just call `connect()` anyway and immediately fail with "that wallet
 * isn't available" (confirmed live, V3-WALLET-001C/F) — a dead end for
 * someone who doesn't have it yet. Once `available === false` and
 * `CONNECTOR_METADATA` gives this connector a real `installUrl`, the row
 * becomes a genuine link to that wallet's own official install page
 * instead, the same `Menu.LinkItem` pattern already used below for "View on
 * Basescan". Every other connector (installed, Coinbase Wallet,
 * WalletConnect, or while availability is still unknown) keeps the
 * original connect-on-click behavior unchanged.
 */
function ConnectorMenuItem({
  connector,
  connect,
}: {
  connector: ReturnType<typeof useWallet>["connectors"][number];
  connect: ReturnType<typeof useWallet>["connect"];
}) {
  const metadata = CONNECTOR_METADATA[connector.id];
  const available = useConnectorAvailability(metadata?.providerFlag);

  if (available === false && metadata?.installUrl) {
    return (
      <Menu.LinkItem
        render={<a href={metadata.installUrl} target="_blank" rel="noopener noreferrer" />}
        closeOnClick
        className={MENU_ITEM_CLASS}
      >
        <ConnectorRow id={connector.id} name={connector.name} icon={connector.icon} available={available} />
      </Menu.LinkItem>
    );
  }

  return (
    <Menu.Item onClick={() => connect({ connector })} closeOnClick={false} className={MENU_ITEM_CLASS}>
      <ConnectorRow id={connector.id} name={connector.name} icon={connector.icon} available={available} />
    </Menu.Item>
  );
}

/** Disconnected — a `Wallet` trigger opening a Menu of the supported connectors, in `lib/wallet/config.ts`'s own configured order (Coinbase Wallet, MetaMask, Rabby Wallet, Trust Wallet, then WalletConnect when configured). */
function ConnectMenu() {
  const { connectors, connect, isConnecting, connectError, resetConnectError } = useWallet();

  return (
    <Menu.Root onOpenChangeComplete={(open) => !open && resetConnectError()}>
      <Menu.Trigger
        disabled={isConnecting}
        aria-label={isConnecting ? "Connecting wallet…" : "Connect wallet"}
        className={cn(
          TRIGGER_CLASS,
          "border-radar-light-border text-radar-light-text hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5",
          isConnecting && "cursor-not-allowed opacity-70"
        )}
      >
        {isConnecting ? (
          <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Wallet className="size-4 shrink-0" aria-hidden="true" />
        )}
        {/* V3-WALLET-001G — `min-w-[101px]` reserves "Connect Wallet"'s own
            measured width (confirmed live: 100.3125px) so swapping to the
            shorter "Connecting…" never shrinks this span. Without it, every
            connect attempt — including ones that fail almost instantly,
            e.g. clicking a not-installed wallet — visibly reflowed the
            whole Topbar for one frame: this trigger sits in the same flex
            row as `CommandPalette`/`WatchlistSelector`, so a ~16px change
            here cascaded into the entire row shifting, read as a flicker. */}
        <span className="inline-block min-w-[101px]">{isConnecting ? "Connecting…" : "Connect Wallet"}</span>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={10}>
          <Menu.Popup className={MENU_POPUP_CLASS}>
            <div className="px-2.5 py-1.5 text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted/70">
              Choose a wallet
            </div>
            {connectors.map((connector) => (
              <ConnectorMenuItem key={connector.uid} connector={connector} connect={connect} />
            ))}
            {connectError && (
              <div role="alert" className="mx-1 mt-1 rounded-lg border border-radar-danger/30 bg-radar-danger/5 p-2.5 text-xs text-radar-danger">
                {connectError}
              </div>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** Connected (supported or unsupported network) — wallet icon + network indicator + ENS/shortened address, opening a Menu of Copy Address / View on Basescan / Disconnect. */
function AccountMenuTrigger() {
  const { address, connector, ensName, chainId, isSupportedNetwork, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const explorerUrl = getWalletExplorerAddressUrl(chainId, address);
  const chainKey = chainId === base.id ? "base" : chainId === baseSepolia.id ? "base-sepolia" : null;
  const chainLabel = chainKey === "base" ? "Base" : chainKey === "base-sepolia" ? "Base Sepolia" : null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable — silently no-op, same as `CopyButton.tsx`.
    }
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Wallet menu — ${ensName ?? shortenAddress(address)}${isSupportedNetwork ? "" : ", unsupported network"}`}
        className={cn(
          TRIGGER_CLASS,
          isSupportedNetwork
            ? "border-radar-light-border text-radar-light-text hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            : "border-radar-warning/40 bg-radar-warning/5 text-radar-warning hover:bg-radar-warning/10"
        )}
      >
        {connector && <ConnectorIcon id={connector.id} icon={connector.icon} />}
        {isSupportedNetwork && chainKey ? (
          <ChainBadge chain={chainKey} size="sm" bare />
        ) : (
          <Tooltip content="Switch your wallet to Base Mainnet or Base Sepolia">
            <span className="flex items-center gap-1">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden xl:inline">Unsupported Network</span>
            </span>
          </Tooltip>
        )}
        {/* `min-w-0` is required here, not decorative — this span is a flex child of a `shrink-0` button, and flex items default to `min-width: auto` (their content's intrinsic width), which silently defeats `truncate` no matter how small `max-w` is. Confirmed live: an untruncated long ENS name pushed the entire Topbar (and the page) into horizontal overflow before this.
            Icon-only below `xl` (1280px) — the same "tablet" tier where `Compare`/`AI Summary` already drop their own text labels (see Topbar's "Priority order under space pressure" comment). Confirmed live: this tier is already tight even in the disconnected placeholder's original design, pre-existing and unrelated to this component; showing the address there only made an existing squeeze worse, so this follows the row's own established icon-only convention instead of inventing a new one. */}
        <Tooltip content={address}>
          <span className="hidden min-w-0 max-w-[110px] truncate xl:inline min-[1440px]:max-w-[160px]">
            {ensName ?? shortenAddress(address)}
          </span>
        </Tooltip>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={10}>
          <Menu.Popup className={MENU_POPUP_CLASS}>
            <div className="flex flex-col gap-1.5 px-2.5 py-2">
              <p className="truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">
                {ensName ?? shortenAddress(address)}
              </p>
              {/* Only shown alongside a real ENS name — otherwise this would repeat the exact same shortened address already shown above. */}
              {ensName && (
                <p className="truncate text-xs text-radar-light-muted dark:text-radar-muted">{shortenAddress(address)}</p>
              )}
              {/* Only on a supported Base network — an unsupported one already gets its own honest "Unsupported Network" treatment on the trigger itself, never both. */}
              {chainLabel && (
                <GlowBadge color="success" dot className="w-fit">
                  Connected to {chainLabel}
                </GlowBadge>
              )}
            </div>

            <div className="my-1 h-px bg-radar-light-border dark:bg-white/10" />

            {/* V3-WALLET-002A — the account dropdown's own path to real
                holdings data, placed first (right under the identity block)
                since it's the primary reason someone would open this menu
                once they're already connected. Reuses `Menu.LinkItem` with
                Next's own `Link` (internal navigation — unlike "View on
                Basescan" below, this never leaves the app), the identical
                pattern already proven for that external link. */}
            <Menu.LinkItem render={<Link href="/dashboard/wallet" />} closeOnClick className={MENU_ITEM_CLASS}>
              <Wallet className="size-4" aria-hidden="true" />
              Open Wallet
            </Menu.LinkItem>

            <Menu.Item onClick={handleCopy} closeOnClick={false} className={MENU_ITEM_CLASS}>
              {copied ? (
                <Check className="size-4 text-radar-success" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy Address"}
            </Menu.Item>

            {explorerUrl && (
              <Menu.LinkItem
                render={<a href={explorerUrl} target="_blank" rel="noopener noreferrer" />}
                closeOnClick
                className={MENU_ITEM_CLASS}
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                View on Basescan
              </Menu.LinkItem>
            )}

            <div className="my-1 h-px bg-radar-light-border dark:bg-white/10" />

            <Menu.Item onClick={() => disconnect()} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-danger outline-none transition-colors data-[highlighted]:bg-radar-danger/10">
              <LogOut className="size-4" aria-hidden="true" />
              Disconnect
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * The Topbar's wallet entry point (V3-WALLET-001) — replaces the previous
 * disabled "Connect wallet (coming soon)" placeholder. Renders one of two
 * real sub-components depending on `useWallet()`'s own `isConnected`; no
 * portfolio/balance data anywhere here, per this phase's explicit scope.
 */
export function WalletButton() {
  const { isConnected } = useWallet();
  return isConnected ? <AccountMenuTrigger /> : <ConnectMenu />;
}
