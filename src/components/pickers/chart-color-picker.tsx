import { useLocation, useNavigate } from "@tanstack/solid-router";
import { For } from "solid-js";
import { LockButton } from "@/components/lock-button";
import { BASE_COLORS, CHART_COLORS, DEFAULT_CONFIG, THEMES } from "@/lib/config";
import type { ChartColor } from "@/lib/types";
import { useIsMobile } from "@/registry/kobalte/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

const EMPTY_STRIP: [string, string, string, string, string] = ["", "", "", "", ""];

const getLabel = (name: ChartColor) =>
  CHART_COLORS.find((c) => c.name === name)?.label ??
  [...BASE_COLORS, ...THEMES].find((c) => c.name === name)?.label;

const getChart = (name: ChartColor) =>
  CHART_COLORS.find((c) => c.name === name)?.chart ?? EMPTY_STRIP;

function ChartStrip(props: { chart: [string, string, string, string, string]; class?: string }) {
  return (
    <div
      class={`flex h-4 w-4 overflow-hidden rounded-full border border-foreground/10 ${props.class ?? ""}`}
    >
      <For each={props.chart}>
        {(color) => <div class="flex-1" style={{ "background-color": color }} />}
      </For>
    </div>
  );
}

export default function ChartColorPicker() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const location = useLocation();

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={6} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Chart Color</div>
            <div class="font-medium text-foreground text-sm">
              {getLabel(location().search.chartColor ?? DEFAULT_CONFIG.chartColor)}
            </div>
          </div>
          <ChartStrip chart={getChart(location().search.chartColor ?? DEFAULT_CONFIG.chartColor)} />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="no-scrollbar max-h-96 w-[calc(100svw-var(--spacing)*4)] md:w-52">
          <DropdownMenuRadioGroup
            value={location().search.chartColor ?? DEFAULT_CONFIG.chartColor}
            onChange={(value) =>
              navigate({
                to: ".",
                search: (prev) => ({ ...prev, chartColor: value as ChartColor }),
              })
            }
          >
            {/* Match base color palette */}
            <DropdownMenuRadioItem value={location().search.baseColor ?? DEFAULT_CONFIG.baseColor}>
              <div class="flex items-start gap-2">
                <ChartStrip
                  chart={getChart(
                    (location().search.baseColor ?? DEFAULT_CONFIG.baseColor) as ChartColor,
                  )}
                  class="translate-y-1"
                />
                <span class="flex flex-col justify-start pointer-coarse:gap-1">
                  <span>
                    {
                      BASE_COLORS.find(
                        (c) => c.name === (location().search.baseColor ?? DEFAULT_CONFIG.baseColor),
                      )?.label
                    }
                  </span>
                  <span class="pointer-coarse:text-sm text-muted-foreground text-xs">
                    Match base color palette
                  </span>
                </span>
              </div>
            </DropdownMenuRadioItem>

            <DropdownMenuSeparator class="my-1" />

            {/* Color Themes */}
            <For each={THEMES.map((t) => t.name)}>
              {(theme) => (
                <DropdownMenuRadioItem value={theme as ChartColor}>
                  <div class="flex items-center gap-2">
                    <ChartStrip chart={getChart(theme as ChartColor)} />
                    <span class="text-sm">{getLabel(theme as ChartColor)}</span>
                  </div>
                </DropdownMenuRadioItem>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <LockButton param="chartColor" class="absolute top-1/2 right-10 -translate-y-1/2" />
    </div>
  );
}
