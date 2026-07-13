/**
 * "Section Transitions" (PR9.3 §13) — a soft radial glow behind a thin
 * gradient-fade line, dropped between major landing-page sections so
 * consecutive `bg-radar-*` blocks (`KeyMetrics`'s bordered strip, `Hero`'s
 * background, etc.) never meet at a hard, one-pixel edge. Purely
 * decorative (`aria-hidden`), no motion — the fade itself is the effect,
 * nothing here needs to animate.
 */
export function SectionDivider() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-px w-full">
      <div
        className="absolute top-1/2 left-1/2 h-24 w-[36rem] max-w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05] blur-3xl dark:opacity-[0.08]"
        style={{ background: "radial-gradient(circle, var(--color-radar-primary) 0%, transparent 70%)" }}
      />
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-radar-light-border to-transparent dark:via-white/10" />
    </div>
  );
}
