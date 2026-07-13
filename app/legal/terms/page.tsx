import type { Metadata } from "next";

import { StaticPage } from "@/components/landing/StaticPage";
import { SITE } from "@/constants/site";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <StaticPage title="Terms of Service" description="Last updated 2026.">
      <div>
        <h2>Informational purposes only</h2>
        <p className="mt-2">
          Base Radar aggregates and displays publicly available onchain, market, and repository
          data. Nothing on this site is financial, investment, or trading advice. Health,
          confidence, and verification scores are heuristics computed from third-party data —
          they reflect data availability and consistency, not project quality or investment
          merit. Always do your own research.
        </p>
      </div>
      <div>
        <h2>No warranty</h2>
        <p className="mt-2">
          Base Radar is provided &quot;as is,&quot; without warranty of any kind. Data is sourced
          from third-party providers and may be delayed, incomplete, or inaccurate. We are not
          liable for decisions made based on information shown on this site.
        </p>
      </div>
      <div>
        <h2>Open source license</h2>
        <p className="mt-2">
          Base Radar&apos;s source code is released under the MIT License. See the{" "}
          <a href={`${SITE.social.github}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
            LICENSE
          </a>{" "}
          file in the repository for the full terms governing the code itself.
        </p>
      </div>
      <div>
        <h2>Changes</h2>
        <p className="mt-2">
          These terms may be updated as the product evolves. Continued use of Base Radar after a
          change constitutes acceptance of the revised terms.
        </p>
      </div>
      <div>
        <h2>Contact</h2>
        <p className="mt-2">
          Questions about these terms: <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>.
        </p>
      </div>
    </StaticPage>
  );
}
