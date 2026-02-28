import { Carere } from "@/components/icons/carere";
import { SolidJS } from "@/components/icons/solidjs";

export function BentoNotch() {
  return (
    <div class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded border bg-background/80 px-6 py-2 shadow-lg backdrop-blur-sm">
      <div class="flex items-center gap-2 whitespace-nowrap font-medium text-muted-foreground text-sm">
        <span>Made by</span>
        <a
          href="https://carere.dev"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex transition-opacity hover:opacity-80"
        >
          <Carere class="size-3.5" />
        </a>
        <span>from</span>
        <span>🇫🇷</span>
        <span>for</span>
        <SolidJS class="size-3.5" />
        <span>community</span>
      </div>
    </div>
  );
}
