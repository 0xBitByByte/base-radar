"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

import logoIcon from "@/public/brand/logo-icon.webp";

const PARTICLES = [
  { top: "18%", left: "12%", size: 5, duration: 7, delay: 0 },
  { top: "30%", left: "80%", size: 4, duration: 9, delay: 1.2 },
  { top: "62%", left: "20%", size: 6, duration: 8, delay: 0.6 },
  { top: "76%", left: "66%", size: 3, duration: 10, delay: 2 },
  { top: "46%", left: "48%", size: 4, duration: 11, delay: 1.5 },
  { top: "14%", left: "56%", size: 3, duration: 6.5, delay: 0.3 },
  { top: "58%", left: "88%", size: 3, duration: 9.5, delay: 0.8 },
];

export function HeroBackground() {
  const prefersReducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Imperative, not `onLoadedMetadata` — that event fired before React
    // had attached the listener often enough in testing (a muted+autoPlay
    // video with a warm browser cache can reach `readyState` 4 essentially
    // immediately) that `playbackRate` silently stayed at the default 1x.
    // Setting it directly after mount, and again on the native `loadedmetadata`
    // event as a fallback for a cold load, covers both timings.
    const video = videoRef.current;
    if (!video) return;
    const applyRate = () => {
      video.playbackRate = 0.4;
    };
    applyRate();
    video.addEventListener("loadedmetadata", applyRate);
    return () => video.removeEventListener("loadedmetadata", applyRate);
  }, []);

  useEffect(() => {
    // Pause the decode/composite cost entirely once the Hero scrolls out of
    // view (e.g. reading the rest of the landing page) and resume the
    // instant it's back — a muted background loop has no reason to keep
    // spending GPU/CPU off-screen.
    const container = containerRef.current;
    if (!container || prefersReducedMotion) return;
    // `cancelled` guards against a stale callback landing after cleanup —
    // React Strict Mode's dev-only mount→cleanup→mount double-invoke can
    // otherwise let a just-disconnected observer's in-flight callback pause
    // the video with nothing left alive to ever resume it. Reading
    // `videoRef.current` fresh inside the callback (rather than capturing it
    // once when the effect runs) matters too: the `<video>` is inside a
    // `{!prefersReducedMotion && ...}` conditional, so it can unmount and
    // remount as a new element — a captured reference to the old node would
    // silently stop affecting anything visible.
    //
    // `skipFirst`: the observer's very first callback just reports the
    // state at `observe()` time, not a real visibility *change* — the
    // `<video autoPlay>` attribute already starts playback correctly on
    // mount. Under Strict Mode's double-invoke, that first callback can
    // fire late (after the second mount's own effect has already set up),
    // and an over-eager `pause()` from it was observed leaving the video
    // frozen on a single frame even though the Hero was fully in view.
    // Only acting on genuine subsequent intersection changes avoids that.
    let cancelled = false;
    let skipFirst = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (cancelled) return;
        if (skipFirst) {
          skipFirst = false;
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0 }
    );
    observer.observe(container);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-radar-light-bg dark:bg-radar-bg"
    >
      {!prefersReducedMotion && (
        // Ambient atmosphere only — reuses the already-encoded, already-muted
        // splash clip (`public/brand/splash-animation.mp4`, built for
        // `SplashScreen`) rather than a second video asset. At this opacity
        // + blur, the 8.7s loop reads as pure abstract color motion, not a
        // recognizable logo replay — exactly "atmosphere, not focus." The
        // radial-gradient mask fades the video's own rectangular edges into
        // the hero background rather than cutting off hard. `-z-20` (behind
        // the grid/blob/particle layers below, which stay the sharper
        // foreground decoration) and never affects layout: it's `absolute
        // inset-0`, sized by the parent, not the reverse.
        <video
          ref={videoRef}
          className="absolute inset-0 -z-20 size-full object-cover opacity-10 blur-[50px] saturate-[0.65]"
          style={{
            maskImage: "radial-gradient(ellipse 78% 72% at 50% 40%, black 45%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 78% 72% at 50% 40%, black 45%, transparent 100%)",
          }}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          src="/brand/splash-animation.mp4"
        />
      )}

      {/* Slow-drifting blue glow that reads as reacting with the video
          beneath it — a much longer, gentler cycle (30s) than the sharper
          decorative blobs further down, which stay a faster secondary
          depth layer. transform/opacity only, so it stays compositor-only
          (GPU) work. */}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute top-1/3 left-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.18]"
          style={{
            background:
              "radial-gradient(circle, var(--color-radar-primary) 0%, transparent 70%)",
          }}
          animate={{ opacity: [0.12, 0.22, 0.12], scale: [1, 1.15, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Same `currentColor`-driven grid pattern `DashboardLayout` uses for
          its own ambient backdrop — inheriting text color instead of a
          fixed white line means it reads correctly in both themes without
          a second, hand-tuned light-mode grid. */}
      <div
        className="absolute inset-0 text-radar-light-text opacity-[0.05] dark:text-radar-white dark:opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />

      {/* The official brand mark itself, extremely large and faint, rotating
          continuously behind both the copy and the preview card — ambient
          identity presence in the style of Apple/Linear/Stripe/Vercel's own
          subtle background motion, not a focal element. Opacity and rotation
          are the only animated properties (never toggled, so it can't read
          as flashing) and both are compositor-only (`transform`/`opacity`),
          so this stays cheap even at 180s/rotation. Rendered (not unmounted)
          under reduced motion, just held static — a faint watermark is still
          appropriate branding presence with zero vestibular-motion cost. */}
      <motion.img
        aria-hidden="true"
        alt=""
        src={logoIcon.src}
        className="absolute top-1/2 left-1/2 max-w-none opacity-[0.05] select-none dark:opacity-[0.06]"
        style={{ width: "min(78vmin, 760px)", height: "auto", x: "-50%", y: "-50%" }}
        animate={prefersReducedMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
      />

      {/* The app's own "radar sweep" motif — a rotating gradient wedge,
          the same rotating-conic-gradient language `BrandSpinner`'s glow
          ring uses elsewhere. This is that motif's home on the landing
          page; it isn't duplicated as a second sweep element anywhere
          else. */}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute left-1/2 top-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.12]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, var(--color-radar-accent) 6deg, transparent 44deg)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        />
      )}

      <motion.div
        className="absolute -left-32 -top-32 size-[32rem] rounded-full bg-radar-primary/30 blur-3xl"
        animate={
          prefersReducedMotion ? undefined : { opacity: [0.5, 0.8, 0.5], scale: [1, 1.08, 1] }
        }
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-24 top-1/4 size-[28rem] rounded-full bg-radar-accent/20 blur-3xl"
        animate={
          prefersReducedMotion ? undefined : { opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }
        }
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 size-[24rem] rounded-full bg-radar-success/10 blur-3xl"
        animate={prefersReducedMotion ? undefined : { opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {!prefersReducedMotion &&
        PARTICLES.map((particle, index) => (
          <motion.span
            key={index}
            className="absolute rounded-full bg-radar-accent/60"
            style={{
              top: particle.top,
              left: particle.left,
              width: particle.size,
              height: particle.size,
            }}
            animate={{ y: [0, -14, 0], opacity: [0.15, 0.75, 0.15] }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: particle.delay,
            }}
          />
        ))}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-radar-light-bg dark:to-radar-bg" />
    </div>
  );
}
