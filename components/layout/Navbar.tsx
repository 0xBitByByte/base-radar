"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Radar, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/constants/site";
import { GradientButton } from "@/components/ui/GradientButton";
import { GithubMark } from "@/components/ui/BrandIcons";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-white/10 bg-radar-bg/85 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          : "border-transparent bg-radar-bg/40 backdrop-blur-md"
      )}
    >
      <nav
        className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-6 lg:px-8"
        aria-label="Primary"
      >
        <Link href="/" className="group flex items-center gap-3" aria-label="Base Radar home">
          <span className="flex size-[2.6rem] items-center justify-center rounded-xl border border-white/10 bg-radar-primary/10 text-radar-accent transition-colors group-hover:bg-radar-primary/20">
            <Radar className="size-6" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-wide text-radar-white">BASE</span>
            <span className="text-base font-bold tracking-wide text-radar-accent">RADAR</span>
          </span>
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-radar-muted transition-colors hover:text-radar-white"
            >
              {link.label === "GitHub" ? (
                <span className="flex items-center gap-1.5">
                  <GithubMark className="size-4" />
                  {link.label}
                </span>
              ) : (
                link.label
              )}
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <GradientButton href="/dashboard" className="px-5 py-2.5 text-sm">
            Launch App
          </GradientButton>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-radar-white md:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/5 md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg px-2 py-2.5 text-sm font-medium text-radar-muted transition-colors hover:bg-white/5 hover:text-radar-white"
                >
                  {link.label}
                </Link>
              ))}
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
  );
}
