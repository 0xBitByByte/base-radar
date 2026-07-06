"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Radar, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/constants/site";
import { GradientButton } from "@/components/ui/GradientButton";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.2.67.8.56C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

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
          <GradientButton href="#" className="px-5 py-2.5 text-sm">
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
                <GradientButton href="#" className="w-full">
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
