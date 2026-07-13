import type { Metadata } from "next";

import { StaticPage } from "@/components/landing/StaticPage";
import { SITE } from "@/constants/site";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <StaticPage title="About Base Radar" description={SITE.tagline}>
      <p>
        Base Radar is an open-source intelligence layer for the Base ecosystem. It aggregates
        onchain, market, and repository data from multiple independent providers into one
        normalized view — project verification, health and confidence scoring, live network
        status, and narrative tracking — so builders, investors, and researchers don&apos;t have to
        piece it together from a dozen separate tools.
      </p>
      <div>
        <h2>Why we built it</h2>
        <p className="mt-2">
          Base is growing fast, and most of that growth is scattered across explorers, DEX
          dashboards, DeFi trackers, and social feeds that don&apos;t talk to each other. Base
          Radar cross-checks every metric it shows against multiple sources and is transparent
          about confidence and freshness, rather than presenting a single number as ground truth.
        </p>
      </div>
      <div>
        <h2>Open source, by design</h2>
        <p className="mt-2">
          The entire codebase, including the provider layer and intelligence engine that power
          every score on this site, is public on{" "}
          <a href={SITE.social.github} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          .
        </p>
      </div>
    </StaticPage>
  );
}
