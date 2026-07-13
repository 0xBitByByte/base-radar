import type { Metadata } from "next";

import { StaticPage } from "@/components/landing/StaticPage";
import { SITE } from "@/constants/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy" description="Last updated 2026.">
      <div>
        <h2>What we collect</h2>
        <p className="mt-2">
          Base Radar does not require an account to use. We don&apos;t collect names, email
          addresses, or other personal information unless you email us directly. Standard web
          server logs (IP address, request timestamps) may be retained briefly for security and
          abuse prevention, as with any web service.
        </p>
      </div>
      <div>
        <h2>Local storage</h2>
        <p className="mt-2">
          Your theme preference (light or dark) is stored in your browser&apos;s local storage.
          Nothing here is transmitted to our servers or shared with third parties.
        </p>
      </div>
      <div>
        <h2>Onchain and market data</h2>
        <p className="mt-2">
          Every project metric shown on Base Radar (TVL, price, GitHub activity, network status)
          is sourced from public, third-party providers and public blockchain data — never from
          information you provide.
        </p>
      </div>
      <div>
        <h2>Wallet connections</h2>
        <p className="mt-2">
          Where wallet-connected features exist or are introduced, only the public wallet address
          you choose to connect is read, to display your own onchain holdings. We never request or
          have access to private keys or seed phrases.
        </p>
      </div>
      <div>
        <h2>Questions</h2>
        <p className="mt-2">
          Email <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a> with any privacy
          questions.
        </p>
      </div>
    </StaticPage>
  );
}
