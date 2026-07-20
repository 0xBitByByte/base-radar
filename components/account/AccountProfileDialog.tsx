"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";
import { useAccount } from "@/lib/hooks/useAccount";
import { AccountAvatar } from "@/components/account/AccountAvatar";
import type { ProfileValidationError } from "@/lib/account/types";

type AccountProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FIELD_CLASS =
  "w-full rounded-xl border border-radar-light-border bg-transparent px-3 py-2 text-sm text-radar-light-text outline-none placeholder:text-radar-light-muted focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:placeholder:text-radar-muted";

const ERROR_MESSAGES: Record<ProfileValidationError, string> = {
  "empty-name": "Display name can't be empty.",
  "empty-username": "Username can't be empty.",
  "invalid-username": "Username must be 3–20 characters — letters, numbers, and underscores only.",
  "invalid-email": "Enter a valid email address, or leave it blank.",
  "duplicate-username": "That username is already taken.",
};

/**
 * Edit dialog for the current account's profile. Mounts
 * `AccountProfileForm` only while `open` — a fresh mount per open means
 * every field initializes directly from `account` via `useState`'s
 * initializer, with no effect resetting state on prop change (the same
 * "setState in an effect" avoidance `WatchlistEditor.tsx` already
 * established for this exact shape of dialog).
 */
export function AccountProfileDialog({ open, onOpenChange }: AccountProfileDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-radar-light-border bg-radar-light-card shadow-2xl outline-none",
            "dark:border-white/10 dark:bg-radar-card",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
          )}
        >
          {open && <AccountProfileForm onOpenChange={onOpenChange} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AccountProfileForm({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { account, updateProfile, validateProfile } = useAccount();
  const [name, setName] = useState(account.name);
  const [username, setUsername] = useState(account.username);
  const [email, setEmail] = useState(account.email ?? "");
  const [avatar, setAvatar] = useState(account.avatar ?? "");
  const [errors, setErrors] = useState<ProfileValidationError[]>([]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateProfile({ name, username, email, avatar });
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    updateProfile({
      name: name.trim(),
      username: username.trim(),
      email: email.trim() === "" ? null : email.trim(),
      avatar: avatar.trim() === "" ? null : avatar.trim(),
    });
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-h-[85vh] flex-col overflow-y-auto p-5">
      <Dialog.Title className="text-lg font-semibold text-radar-light-text dark:text-radar-white">
        Edit Profile
      </Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-radar-light-muted dark:text-radar-muted">
        {account.isGuest
          ? "You're using a local Guest account — changes are saved on this device only."
          : "Update how your account appears across Base Radar."}
      </Dialog.Description>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <AccountAvatar account={{ name, avatar: avatar.trim() === "" ? null : avatar }} size="lg" />
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="account-avatar" className="text-xs font-medium text-radar-light-text dark:text-radar-white">
              Avatar URL
            </label>
            <input
              id="account-avatar"
              value={avatar}
              onChange={(event) => setAvatar(event.target.value)}
              placeholder="https://…"
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-name" className="text-xs font-medium text-radar-light-text dark:text-radar-white">
            Display Name
          </label>
          <input
            id="account-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Ada Lovelace"
            required
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-username" className="text-xs font-medium text-radar-light-text dark:text-radar-white">
            Username
          </label>
          <input
            id="account-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="e.g. ada"
            required
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-email" className="text-xs font-medium text-radar-light-text dark:text-radar-white">
            Email <span className="font-normal text-radar-light-muted dark:text-radar-muted">(optional)</span>
          </label>
          <input
            id="account-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={FIELD_CLASS}
          />
        </div>

        {errors.length > 0 && (
          <div
            role="alert"
            className="rounded-lg border border-radar-danger/30 bg-radar-danger/5 p-3 text-xs text-radar-danger"
          >
            <ul className="list-inside list-disc">
              {errors.map((error) => (
                <li key={error}>{ERROR_MESSAGES[error]}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-radar-primary px-3 py-1.5 text-sm font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:bg-radar-accent dark:text-radar-bg dark:hover:bg-radar-accent/90"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
