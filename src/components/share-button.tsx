import { Check, Share } from "lucide-solid";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

export function ShareButton() {
  const [hasCopied, setHasCopied] = createSignal(false);

  createEffect(() => {
    if (hasCopied()) {
      const timer = setTimeout(() => setHasCopied(false), 2000);
      onCleanup(() => clearTimeout(timer));
    }
  });

  const handleCopy = async () => {
    try {
      // Use window.location.href directly to get the full URL with search params
      const shareUrl = typeof window !== "undefined" ? window.location.href : "";
      await navigator.clipboard.writeText(shareUrl);
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
