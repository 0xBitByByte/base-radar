"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_LINKS, type NavLink } from "@/constants/site";
import { GradientButton } from "@/components/ui/GradientButton";
import { GithubMark } from "@/components/ui/BrandIcons";
import { HeaderLogo } from "@/components/branding/HeaderLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleNavClick(event: React.MouseEvent<HTMLAnchorElement>, link: NavLink) {
    if (!link.href.startsWith("#")) return;
    const target = document.querySelector(link.href);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    setIsOpen(false);
  }

  function renderNavLink(link: NavLink, className: string) {
    const content =
      link.label === "GitHub" ? (
        <span className="flex items-center gap-1.5">
          <GithubMark className="size-4" />
          {link.label}
        </span>
      ) : (
        link.label
      );

    if (link.external) {
      return (
        <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
          {content}
        </a>
      );
    }

    return (
      <Link key={link.label} href={link.href} onClick={(event) => handleNavClick(event, link)} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-all duration-300",
          scrolled
            ? "border-radar-light-border bg-radar-light-card/85 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.15)] backdrop-blur-xl dark:border-white/10 dark:bg-radar-bg/85 dark:shadow-[0_8px_30px_-20px_rgba(0,0,0,0.9)]"
            : "border-transparent bg-radar-light-bg/40 backdrop-blur-md dark:bg-radar-bg/40"
        )}
      >
        <nav
          className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10"
          aria-label="Primary"
        >
          <Link href="/" aria-label="Base Radar home" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50">
            <HeaderLogo height={41} className="transition-transform duration-200 ease-out group-hover:scale-105" />
          </Link>

          <div className="hidden items-center gap-11 md:flex">
            {NAV_LINKS.map((link) =>
              renderNavLink(
                link,
                "text-sm font-medium text-radar-light-muted transition-colors hover:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white"
              )
            )}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle variant="icon" />
            <GradientButton href="/dashboard" className="px-5 py-2.5 text-sm">
              Launch App
            </GradientButton>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle variant="icon" />
            <button
              type="button"
              onClick={() => setIsOpen((open) => !open)}
              className="flex size-9 items-center justify-center rounded-lg border border-radar-light-border text-radar-light-text dark:border-white/10 dark:text-radar-white"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-radar-light-border md:hidden dark:border-white/5"
            >
              <div className="flex flex-col gap-1 px-6 py-4">
                {NAV_LINKS.map((link) =>
                  renderNavLink(
                    link,
                    "rounded-lg px-2 py-2.5 text-sm font-medium text-radar-light-muted transition-colors hover:bg-radar-light-surface hover:text-radar-light-text dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-white"
                  )
                )}
                <div className="mt-2">
                  <GradientButton href="/dashboard" className="w-full">
                    Launch App
                  </GradientButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </MotionConfig>
  );
}
