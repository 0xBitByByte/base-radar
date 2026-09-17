"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Copy, Download, Share2 } from "lucide-react";

import { cn, downloadTextFile } from "@/lib/utils";
import { buildSharePreview } from "@/lib/report-share/engine";
import { buildShareFilename } from "@/lib/report-share/filename";
import { DEFAULT_SHARE_OPTIONS, SHARE_PRESETS } from "@/lib/report-share/types";
import type { ShareFormat, ShareIncludeOptions, ShareSourceData } from "@/lib/report-share/types";

/**
 * V4-FUTURE-002 (Feature 7 — Smart Report Sharing) — prepares an
 * already-built `HistoricalReport` (plus opt-in extra sections) for the
 * user to copy or download elsewhere. No upload, no external service call.
 * Every checkbox toggles a section this app ALREADY built
 * (`ShareSourceData`'s own fields); this file never computes a new fact.
 *
 * V4-FUTURE-002B — adds Download (reusing the same `downloadTextFile`
 * pattern every other export feature uses), four fixed Presets (each just
 * a different `ShareIncludeOptions` combination — see
 * `lib/report-share/types.ts`'s `SHARE_PRESETS`), and a Stats line
 * (`bundle.stats`, computed once inside `buildShareProfile()` — never
 * recomputed here).
 */

const FORMAT_TABS: { format: ShareFormat; label: string }[] = [
  { format: "markdown", label: "Markdown" },
  { format: "text", label: "Text" },
  { format: "html", label: "HTML" },
];

const FORMAT_MIME: Record<ShareFormat, string> = { markdown: "text/markdown", text: "text/plain", html: "text/html" };

const INCLUDE_TOGGLES: { key: keyof ShareIncludeOptions; label: string }[] = [
  { key: "history", label: "History" },
  { key: "timeline", label: "Timeline" },
  { key: "recommendations", label: "Recommendations" },
  { key: "highlights", label: "Highlights" },
  { key: "digest", label: "Digest" },
  { key: "story", label: "Story" },
];

/** Whether a given toggle has real data behind it — an unavailable source stays disabled rather than silently including nothing. */
function isToggleAvailable(key: keyof ShareIncludeOptions, data: ShareSourceData): boolean {
  if (key === "digest") return data.digest !== null;
  if (key === "story") return data.story !== null;
  return true;
}

function DownloadBundleButton({ format, content, generatedAt }: { format: ShareFormat; content: string; generatedAt: string }) {
  return (
    <button
      type="button"
      onClick={() => downloadTextFile(buildShareFilename(format, generatedAt), content, FORMAT_MIME[format])}
      className="flex items-center gap-1.5 rounded-xl border border-radar-light-border px-3.5 py-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
    >
      <Download className="size-3.5 shrink-0" aria-hidden="true" />
      Download
    </button>
  );
}

function CopyBundleButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable — the preview text is still visible and selectable by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-xl bg-radar-primary px-3.5 py-2 text-xs font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50"
    >
      {copied ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : <Copy className="size-3.5 shrink-0" aria-hidden="true" />}
      {copied ? "Copied" : "Copy to Clipboard"}
    </button>
  );
}

export function ReportSharePreviewButton({ data }: { data: ShareSourceData | null }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ShareIncludeOptions>(DEFAULT_SHARE_OPTIONS);
  const [format, setFormat] = useState<ShareFormat>("markdown");

  const bundle = useMemo(() => (data ? buildSharePreview(data, options) : null), [data, options]);

  if (!data || !bundle) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <button
            type="button"
            className="rounded-full border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          />
        }
      >
        <span className="flex items-center gap-1">
          <Share2 className="size-3 shrink-0" aria-hidden="true" />
          Share
        </span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-radar-bg/40 backdrop-blur-sm dark:bg-black/60",
            "transition-opacity duration-200 motion-reduce:transition-none",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-2xl border border-radar-light-border bg-radar-light-card p-5 shadow-2xl outline-none dark:border-white/10 dark:bg-radar-card",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
          )}
        >
          <Dialog.Title className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{bundle.title}</Dialog.Title>
          <Dialog.Description className="text-xs text-radar-light-muted dark:text-radar-muted">{bundle.description}</Dialog.Description>
          <p className="text-xs text-radar-light-text dark:text-radar-white">{bundle.summary}</p>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Share presets">
            {SHARE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setOptions(preset.options)}
                className="rounded-full border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Include in share">
            {INCLUDE_TOGGLES.map(({ key, label }) => {
              const available = isToggleAvailable(key, data);
              return (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border border-radar-light-border px-2.5 py-1 text-[11px] font-medium text-radar-light-text dark:border-white/10 dark:text-radar-white",
                    !available && "cursor-not-allowed opacity-40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={options[key]}
                    disabled={!available}
                    onChange={(e) => setOptions((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="size-3"
                  />
                  {label}
                </label>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5" role="group" aria-label="Share format">
            {FORMAT_TABS.map(({ format: f, label }) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                aria-pressed={format === f}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                  format === f
                    ? "border-radar-primary bg-radar-primary/10 text-radar-primary dark:border-radar-accent dark:bg-radar-accent/10 dark:text-radar-accent"
                    : "border-radar-light-border text-radar-light-muted hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            readOnly
            value={bundle[format]}
            aria-label="Share preview"
            className="min-h-48 flex-1 resize-none rounded-xl border border-radar-light-border bg-radar-light-surface p-3 font-mono text-[11px] text-radar-light-text outline-none dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
          />

          <p className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
            {bundle.stats.sectionsIncluded} section{bundle.stats.sectionsIncluded === 1 ? "" : "s"} · {bundle.stats.wordCount} word{bundle.stats.wordCount === 1 ? "" : "s"} · ~{bundle.stats.estimatedReadingMinutes} min read
          </p>

          <div className="flex items-center justify-end gap-2">
            <Dialog.Close className="rounded-lg px-3 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5">
              Close
            </Dialog.Close>
            <DownloadBundleButton format={format} content={bundle[format]} generatedAt={bundle.generatedAt} />
            <CopyBundleButton content={bundle[format]} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
