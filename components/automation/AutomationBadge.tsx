import {
  AUTOMATION_ACTION_BADGE_CLASS,
  AUTOMATION_ACTION_ICON,
  AUTOMATION_ACTION_LABEL,
  AUTOMATION_TRIGGER_BADGE_CLASS,
  AUTOMATION_TRIGGER_ICON,
  AUTOMATION_TRIGGER_LABEL,
} from "@/components/automation/meta";
import type { AutomationAction, AutomationTriggerType } from "@/lib/automation/types";
import { cn } from "@/lib/utils";

const BADGE_CLASS = "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold";

type AutomationActionBadgeProps = {
  action: AutomationAction;
  className?: string;
};

/** The Action badge — what an automation would do (data only; nothing is actually sent/queued/executed by this component). */
export function AutomationActionBadge({ action, className }: AutomationActionBadgeProps) {
  const Icon = AUTOMATION_ACTION_ICON[action];
  return (
    <span className={cn(BADGE_CLASS, AUTOMATION_ACTION_BADGE_CLASS[action], className)}>
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {AUTOMATION_ACTION_LABEL[action]}
    </span>
  );
}

type AutomationTriggerBadgeProps = {
  trigger: AutomationTriggerType;
  className?: string;
};

/** The Trigger badge — which notification type or meta-condition fired the rule. Reuses Timeline's own icon/label maps for the 10 real notification types; the 3 meta-triggers (unread/high-priority/critical) get their own entries in `meta.ts`. */
export function AutomationTriggerBadge({ trigger, className }: AutomationTriggerBadgeProps) {
  const Icon = AUTOMATION_TRIGGER_ICON[trigger];
  return (
    <span className={cn(BADGE_CLASS, AUTOMATION_TRIGGER_BADGE_CLASS[trigger], className)}>
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {AUTOMATION_TRIGGER_LABEL[trigger]}
    </span>
  );
}
