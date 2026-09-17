/**
 * PR-091.03/PR-091.05 (Intelligence Compare, Contract Compare) — the one
 * new server surface this scope of Compare actually needs. Reuses, never
 * reimplements: `buildProjectIntelligence`/`buildHealthScorecard`/
 * `buildIntelligenceReport` are the exact same calls
 * `app/dashboard/projects/[slug]/page.tsx` already makes for this project's
 * own AI Intelligence page, and `blockscout.getContractDetail` is the exact
 * same per-address call that page's Contracts section already makes. This
 * route exists only because Compare's selection is client-only local-device
 * state (`lib/compare/storage.ts`) — the Server Component rendering
 * `/dashboard/compare` has no way to know in advance which up-to-4 projects
 * to build this for, so the client fetches it per selected project instead.
 *
 * Deliberately omits `categoryTvlLeadership` (a category-wide TVL ranking
 * that would mean re-deriving the full registry's category peers per
 * Compare request) — it feeds exactly one `highlights` bullet this route
 * doesn't expose, never `strengths`/`weaknesses`/`opportunities`/`threats`/
 * `recommendation`.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getProject } from "@/data/projects/helpers";
import type { Project } from "@/data/projects/types";
import { normalizeName } from "@/lib/intelligence/helpers";
import { buildProjectIntelligence } from "@/lib/intelligence/engine";
import { buildIntelligenceReport } from "@/lib/intelligence/report";
import { buildHealthScorecard } from "@/lib/intelligence/scorecard";
import { getRawWhaleEvents } from "@/lib/data/aggregate";
import * as blockscout from "@/lib/providers/blockscout/service";
import type { CompareContractDetail, CompareProjectDetail } from "@/lib/compare/detail";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const registryProject = getProject(slug);
  if (!registryProject) {
    return NextResponse.json({ error: "No registry project matches that id or slug." }, { status: 404 });
  }

  try {
    return await buildCompareDetailResponse(registryProject);
  } catch {
    // A real upstream-provider failure (e.g. `getRawWhaleEvents()` — already
    // known fallible enough that `lib/data/aggregate.ts`'s own
    // `getWhaleEventsImpl` wraps it in try/catch) should surface as a clean,
    // honest 502, never an uncaught exception reaching Next.js's default
    // error page. `useCompareProjectDetail`'s `!response.ok` check already
    // treats any non-2xx response as a real, honest error state.
    return NextResponse.json({ error: "Couldn't build intelligence/contract detail for this project right now." }, { status: 502 });
  }
}

async function buildCompareDetailResponse(registryProject: Project): Promise<NextResponse> {
  const [profile, allWhaleEvents] = await Promise.all([
    buildProjectIntelligence(registryProject, undefined, { extended: false }),
    getRawWhaleEvents(),
  ]);

  const whaleEvents = allWhaleEvents.filter((event) => event.projectId === profile.identity.id);
  const narrativeLabel = profile.narrative?.label ?? null;
  const githubUrl = profile.github.available && profile.github.fullName ? `https://github.com/${profile.github.fullName}` : null;
  const communityLinkFields = [
    profile.identity.websiteUrl,
    githubUrl,
    profile.community.socials.twitter,
    profile.community.socials.discord,
    profile.community.socials.telegram,
    profile.community.socials.farcaster,
    profile.community.governanceUrl,
    profile.community.socials.docs,
    profile.community.socials.blog,
    profile.community.socials.forum,
    profile.community.socials.medium,
    profile.community.socials.mirror,
    profile.community.socials.linkedin,
  ];
  const communityLinkCount = communityLinkFields.filter(Boolean).length;
  const communityLinkTotal = communityLinkFields.length;

  const scorecardTiles = buildHealthScorecard({
    health: profile.health,
    confidence: profile.confidence,
    risk: profile.risk,
    market: profile.market,
    tvl: profile.tvl,
    trading: profile.trading,
    github: profile.github,
    governance: profile.governance,
    governanceType: profile.community.governanceType,
    whaleEvents,
    narrativeLabel,
    communityLinkCount,
    communityLinkTotal,
    contracts: profile.contracts,
    verificationStatus: profile.community.verificationStatus,
    docsUrl: profile.community.socials.docs ?? null,
  });

  const report = buildIntelligenceReport({
    identity: profile.identity,
    health: profile.health,
    confidence: profile.confidence,
    risk: profile.risk,
    tvl: profile.tvl,
    market: profile.market,
    github: profile.github,
    chain: profile.chain,
    verificationStatus: profile.community.verificationStatus,
    governance: profile.governance,
    whaleEvents,
    sources: profile.sources,
    narrativeLabel,
    scorecardTiles,
    tradingPoolCount: profile.trading.pools.length,
    coingeckoId: registryProject.providerIds.coingeckoId ?? null,
    defillamaSlug: registryProject.providerIds.defillamaSlug ?? null,
    contracts: profile.contracts,
    community: profile.community,
    registryUpdatedAt: registryProject.lifecycle?.updatedAt ?? null,
    discoveredAt: registryProject.lifecycle?.discoveredAt ?? null,
    discoverySource: registryProject.lifecycle?.discoverySource ?? null,
  });

  const candidateAddresses = [
    ...(registryProject.providerIds.blockscoutAddress ? [registryProject.providerIds.blockscoutAddress] : []),
    ...profile.contracts.items.filter((item) => item.chain === "base").map((item) => item.address),
  ].filter((address, index, all) => all.findIndex((other) => normalizeName(other) === normalizeName(address)) === index);

  const contractResults = await Promise.all(
    candidateAddresses.map(async (address) => {
      const chain = profile.contracts.items.find((item) => normalizeName(item.address) === normalizeName(address))?.chain ?? "base";
      const result = await blockscout.getContractDetail(address);
      const detail: CompareContractDetail = result.ok
        ? {
            address,
            chain,
            ok: true,
            verified: result.data.verified,
            isContract: result.data.isContract,
            proxyType: result.data.proxyType,
            compilerVersion: result.data.compilerVersion,
            licenseType: result.data.licenseType,
          }
        : { address, chain, ok: false, verified: null, isContract: null, proxyType: null, compilerVersion: null, licenseType: null };
      return detail;
    })
  );

  const body: CompareProjectDetail = {
    recommendation: report.recommendation,
    strengths: report.strengths,
    weaknesses: report.weaknesses,
    opportunities: report.opportunities,
    threats: report.threats,
    contracts: contractResults,
  };

  return NextResponse.json(body);
}
