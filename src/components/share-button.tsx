import { useLocation } from "@tanstack/solid-router";
import { Check, Share } from "lucide-solid";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

export function ShareButton() {
  const location = useLocation();
  const [hasCopied, setHasCopied] = createSignal(false);

  const shareUrl = createMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const loc = location();
    return `${origin}${loc.pathname}${loc.search}`;
  });

  createEffect(() => {
    if (hasCopied()) {
      const timer = setTimeout(() => setHasCopied(false), 2000);
      onCleanup(() => clearTimeout(timer));
    }
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setHasCopied(true);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger as={Button} variant="outline" size="sm" onClick={handleCopy}>
        {hasCopied() ? <Check /> : <Share />}
        <span>Share</span>
      </TooltipTrigger>
      <TooltipContent>{hasCopied() ? "Copied!" : "Copy Link"}</TooltipContent>
    </Tooltip>
  );
}
