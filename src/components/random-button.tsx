import { useLocation, useNavigate } from "@tanstack/solid-router";
import { Dice5 } from "lucide-solid";
import { type ComponentProps, onCleanup, onMount } from "solid-js";
import {
  BASE_COLORS,
  DEFAULT_CONFIG,
  FONTS,
  MENU_ACCENTS,
  RADII,
  STYLES,
  THEMES,
} from "@/lib/config";
import type { BaseColor, Font, MenuAccent, Radius, Style, Theme } from "@/lib/types";
import { useLocks } from "@/lib/use-locks";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/ui/button";
import { Kbd } from "@/registry/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/ui/tooltip";

function randomItem<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function RandomButton(props: Pick<ComponentProps<"button">, "class">) {
  const { locks } = useLocks();
  const location = useLocation();
  const navigate = useNavigate();

  const handleRandomize = () => {
    const currentLocks = locks();
    const currentSearch = location().search;

    // Use current value if locked, otherwise randomize
    const style: Style = currentLocks.has("style")
      ? (currentSearch.style ?? DEFAULT_CONFIG.style)
      : randomItem(STYLES).name;

    const baseColor: BaseColor = currentLocks.has("baseColor")
      ? (currentSearch.baseColor ?? DEFAULT_CONFIG.baseColor)
      : randomItem(BASE_COLORS).name;

    // Theme can be a base color or a theme color
    const allThemes = [...THEMES.map((t) => t.name), ...BASE_COLORS.map((c) => c.name)] as Theme[];
    const theme: Theme = currentLocks.has("theme")
      ? (currentSearch.theme ?? DEFAULT_CONFIG.theme)
      : randomItem(allThemes);

    const font: Font = currentLocks.has("font")
      ? (currentSearch.font ?? DEFAULT_CONFIG.font)
      : randomItem(FONTS).value;

    // Include "default" radius option
    const allRadii = ["default", ...RADII.map((r) => r.name)] as Radius[];
    const radius: Radius = currentLocks.has("radius")
      ? (currentSearch.radius ?? DEFAULT_CONFIG.radius)
      : randomItem(allRadii);

    const menuAccent: MenuAccent = currentLocks.has("menuAccent")
      ? (currentSearch.menuAccent ?? DEFAULT_CONFIG.menuAccent)
      : randomItem(MENU_ACCENTS).name;

    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        style,
        baseColor,
        theme,
        font,
        radius,
        menuAccent,
      }),
    });
  };

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey) {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }
        e.preventDefault();
        handleRandomize();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  return (
    <Tooltip placement="left">
      <TooltipTrigger
        as={Button}
        variant="ghost"
        size="sm"
        onClick={handleRandomize}
        class={cn(
          "h-[calc(--spacing(13.5))] w-[140px] touch-manipulation select-none justify-between rounded-xl border border-foreground/10 bg-muted/50 focus-visible:border-transparent focus-visible:ring-1 sm:rounded-lg md:w-full md:rounded-lg md:border-transparent md:bg-transparent md:pr-3.5! md:pl-2! md:hover:bg-muted",
          props.class,
        )}
      >
        <div class="flex flex-col justify-start text-left">
          <div class="text-muted-foreground text-xs">Shuffle</div>
          <div class="font-medium text-foreground text-sm">Try Random</div>
        </div>
        <Dice5 class="size-5 md:hidden" />
        <Kbd class="hidden bg-foreground/10 text-foreground md:flex">R</Kbd>
      </TooltipTrigger>
      <TooltipContent>Use browser back/forward to navigate history</TooltipContent>
    </Tooltip>
  );
}
