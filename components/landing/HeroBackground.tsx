"use client";

import { motion, useReducedMotion } from "framer-motion";

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

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-radar-bg">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-radar-white) 1px, transparent 1px), linear-gradient(to bottom, var(--color-radar-white) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />

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

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-radar-bg" />
    </div>
  );
}
