"use client";

import { Avatar } from "@base-ui/react/avatar";

import { cn } from "@/lib/utils";
import type { Account } from "@/lib/account/types";

/** First letter of up to the first two words in `name` — "Guest User" → "GU", "Ada" → "A". Never reads `username`/`email` for this — a display name is the one field guaranteed non-empty. */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

const SIZE_CLASSES = {
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-16 text-xl",
} as const;

type AccountAvatarProps = {
  account: Pick<Account, "name" | "avatar">;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
};

/**
 * A single, reusable avatar for the Account Layer — `AccountMenu`'s
 * trigger and `AccountProfileDialog`'s preview both render this, so the
 * "image if set, else initials" fallback logic only ever lives in one
 * place. `Avatar.Image` itself already handles a broken/unreachable URL by
 * falling through to `Avatar.Fallback` — no manual `onError` handling
 * needed.
 */
export function AccountAvatar({ account, size = "md", className }: AccountAvatarProps) {
  return (
    <Avatar.Root
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-radar-light-border bg-radar-primary/10 dark:border-white/10",
        SIZE_CLASSES[size],
        className
      )}
    >
      {account.avatar && <Avatar.Image src={account.avatar} alt="" className="size-full object-cover" />}
      <Avatar.Fallback className="font-semibold text-radar-primary dark:text-radar-accent">
        {getInitials(account.name)}
      </Avatar.Fallback>
    </Avatar.Root>
  );
}
