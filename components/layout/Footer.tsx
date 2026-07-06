import Link from "next/link";
import { Radar } from "lucide-react";

import { FOOTER_LINK_GROUPS, SITE } from "@/constants/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-radar-bg">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-6">
          <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-radar-primary/10 text-radar-accent">
                <Radar className="size-4" />
              </span>
              <span className="text-sm font-semibold text-radar-white">{SITE.name}</span>
            </div>
            <p className="max-w-xs text-sm text-radar-muted">{SITE.tagline}</p>
          </div>

          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-wider text-radar-white/80 uppercase">
                {group.title}
              </span>
              <ul className="flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-radar-muted transition-colors hover:text-radar-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/5 pt-8">
          <p className="text-center text-xs text-radar-muted sm:text-left">
            © {year} {SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
