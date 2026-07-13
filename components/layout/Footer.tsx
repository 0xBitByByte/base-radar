import Link from "next/link";

import { cn } from "@/lib/utils";
import { FOOTER_LINK_GROUPS, SITE } from "@/constants/site";
import { Tooltip } from "@/components/ui/Tooltip";
import { buildSocialNavLinks } from "@/lib/branding/socials";
import { FooterLogo } from "@/components/branding/FooterLogo";

/** GitHub/X's neutral hover matches `Sidebar`'s theme-aware version of the same hover; only the brand-color hovers (Discord/Telegram/Linktree) are shared, via `buildSocialNavLinks`. */
const NEUTRAL_HOVER_CLASS =
  "hover:bg-radar-light-text/5 hover:text-radar-light-text dark:hover:bg-white/10 dark:hover:text-white";

/** PR9.3 — GitHub back in the community icon row (in addition to the text
 * link in the Company group), in the exact order the brief calls for:
 * GitHub, X, Discord, Telegram, Website. `buildSocialNavLinks` already
 * returns that exact order; only the trailing "Linktree" label is
 * relabeled "Website" here since that's Base Radar's real all-links hub —
 * `Sidebar`'s own call to the same helper keeps its "Linktree" label
 * unaffected. */
const COMMUNITY_LINKS = buildSocialNavLinks(NEUTRAL_HOVER_CLASS).map((link) =>
  link.label === "Linktree" ? { ...link, label: "Website", ariaLabel: "Visit Base Radar's website links" } : link
);

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="site-footer" className="border-t border-radar-light-border bg-radar-light-bg dark:border-white/5 dark:bg-radar-bg">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-6">
          <div className="group flex flex-col gap-3 sm:col-span-2">
            <FooterLogo height={68} className="w-fit transition-transform duration-200 ease-out group-hover:scale-105" />
            <p className="max-w-xs text-sm text-radar-light-muted dark:text-radar-muted">{SITE.tagline}</p>
          </div>

          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-wider text-radar-light-text/80 uppercase dark:text-radar-white/80">
                {group.title}
              </span>
              <ul className="flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-radar-light-muted transition-colors hover:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-radar-light-muted transition-colors hover:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold tracking-wider text-radar-light-text/80 uppercase dark:text-radar-white/80">
              Community
            </span>
            <div className="flex items-center gap-1 -ml-2">
              {COMMUNITY_LINKS.map((link) => (
                <Tooltip key={link.label} content={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.ariaLabel}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-all duration-200 dark:text-radar-muted",
                      "hover:scale-110 hover:shadow-[0_0_14px_-3px_currentColor] motion-reduce:hover:scale-100",
                      "focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:focus-visible:ring-offset-radar-bg",
                      link.hoverClassName
                    )}
                  >
                    <link.Icon className="size-4" />
                  </a>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-radar-light-border pt-8 dark:border-white/5">
          <p className="text-center text-xs text-radar-light-muted sm:text-left dark:text-radar-muted">
            © {year} {SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
