import { useLocation, useNavigate } from "@tanstack/solid-router";
import { For } from "solid-js";
import { BASE_COLORS, DEFAULT_CONFIG, THEMES } from "@/lib/config";
import type { Theme } from "@/lib/types";
import { useIsMobile } from "@/registry/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";

const getLabel = (theme: Theme) => [...BASE_COLORS, ...THEMES].find((t) => t.name === theme)?.label;
const getColor = (theme: Theme) => [...BASE_COLORS, ...THEMES].find((t) => t.name === theme)?.color;

export default function ThemePicker() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const location = useLocation();

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={6} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Theme</div>
            <div class="font-medium text-foreground text-sm">
              {getLabel(
                BASE_COLORS.map((c) => c.name).includes(
                  location().search.theme ?? DEFAULT_CONFIG.theme,
                )
                  ? (location().search.baseColor ?? DEFAULT_CONFIG.baseColor)
                  : (location().search.theme ?? DEFAULT_CONFIG.theme),
              )}
            </div>
          </div>
          <div
            class="size-4 rounded-full border border-foreground/10"
            style={{
              "background-color": getColor(
                BASE_COLORS.map((c) => c.name).includes(
                  location().search.theme ?? DEFAULT_CONFIG.theme,
                )
                  ? (location().search.baseColor ?? DEFAULT_CONFIG.baseColor)
                  : (location().search.theme ?? DEFAULT_CONFIG.theme),
              ),
            }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="no-scrollbar max-h-96 w-[calc(100svw-var(--spacing)*4)] md:w-52">
          <DropdownMenuRadioGroup
            value={location().search.theme ?? DEFAULT_CONFIG.theme}
            onChange={(value) =>
              navigate({ to: ".", search: (prev) => ({ ...prev, theme: value as Theme }) })
            }
          >
            {/* Base Color Match Group */}
            <DropdownMenuRadioItem value={location().search.baseColor ?? DEFAULT_CONFIG.baseColor}>
              <div class="flex items-start gap-2">
                <div
                  class="size-4 translate-y-1 rounded-full border border-foreground/10"
                  style={{
                    "background-color": BASE_COLORS.find(
                      (c) => c.name === location().search.baseColor,
                    )?.color,
                  }}
                />
                <span class="flex flex-col justify-start pointer-coarse:gap-1">
                  <span>
                    {BASE_COLORS.find((c) => c.name === location().search.baseColor)?.label}
                  </span>
                  <span class="pointer-coarse:text-sm text-muted-foreground text-xs">
                    Match base color
                  </span>
                </span>
              </div>
            </DropdownMenuRadioItem>

            <DropdownMenuSeparator class="my-1" />

            {/* Color Themes Group */}
            <For each={THEMES.map((t) => t.name)}>
              {(theme) => (
                <DropdownMenuRadioItem value={theme}>
                  <div class="flex items-center gap-2">
                    <div
                      class="size-4 rounded-full border border-foreground/10"
                      style={{ "background-color": getColor(theme as Theme) }}
                    />
                    <span class="text-sm">{getLabel(theme as Theme)}</span>
                  </div>
                </DropdownMenuRadioItem>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
