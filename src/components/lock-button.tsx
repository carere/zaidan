import { Lock, LockOpen } from "lucide-solid";
import type { LockableParam } from "@/lib/types";
import { useLocks } from "@/lib/use-locks";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/ui/tooltip";

export function LockButton(props: { param: LockableParam; class?: string }) {
  const { isLocked, toggleLock } = useLocks();

  return (
    <Tooltip>
      <TooltipTrigger
        as="button"
        type="button"
        onClick={() => toggleLock(props.param)}
        data-locked={isLocked(props.param)}
        class={cn(
          "flex pointer-coarse:hidden size-4 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity focus:opacity-100 group-focus-within/picker:opacity-100 group-hover/picker:opacity-100 data-[locked=true]:opacity-100",
          props.class,
        )}
        aria-label={isLocked(props.param) ? "Unlock" : "Lock"}
      >
        {isLocked(props.param) ? (
          <Lock strokeWidth={2} class="size-4 text-foreground" />
        ) : (
          <LockOpen strokeWidth={2} class="size-4 text-foreground" />
        )}
      </TooltipTrigger>
      <TooltipContent>{isLocked(props.param) ? "Unlock" : "Lock"}</TooltipContent>
    </Tooltip>
  );
}
