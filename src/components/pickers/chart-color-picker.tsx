import { useLocation, useNavigate } from "@tanstack/solid-router";
import { For } from "solid-js";
import { LockButton } from "@/components/lock-button";
import { BASE_COLORS, CHART_COLORS, DEFAULT_CONFIG, THEMES } from "@/lib/config";
import type { ChartColor, Theme } from "@/lib/types";
import { useIsMobile } from "@/registry/kobalte/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

const MATCH_THEME_ENTRY = CHART_COLORS.find((c) => c.name === "match-theme");
const SELECTABLE_CHART_COLORS = CHART_COLORS.filter((c) => c.name !== "match-theme");

function getChartTuple(name: ChartColor): [string, string, string, string, string] | undefined {
  return CHART_COLORS.find((c) => c.name === name)?.chart;
}

function getLabel(name: ChartColor): string | undefined {
  return CHART_COLORS.find((c) => c.name === name)?.label;
}

/**
 * Resolve which chart palette is currently rendered. Mirrors
 * `buildRegistryTheme`'s precedence: chartColor wins, "match-theme" falls back
 * to whichever theme is active (which itself falls back to baseColor when the
 * theme picker is showing "Match base color").
 */
function getActiveChartTuple(args: {
  chartColor: ChartColor;
  theme: Theme;
  baseColor: Theme;
}): [string, string, string, string, string] {
  if (args.chartColor !== "match-theme") {
    return getChartTuple(args.chartColor) ?? getChartTuple(args.theme) ?? ["", "", "", "", ""];
  }
  // Theme picker treats `theme === baseColor` as "match base color"; either way
  // we just use whatever name the theme search-param holds.
  return getChartTuple(args.theme) ?? getChartTuple(args.baseColor) ?? ["", "", "", "", ""];
}

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

  const currentChartColor = (): ChartColor =>
    location().search.chartColor ?? DEFAULT_CONFIG.chartColor;
  const currentTheme = (): Theme => location().search.theme ?? DEFAULT_CONFIG.theme;
  const currentBaseColor = (): Theme =>
    (location().search.baseColor ?? DEFAULT_CONFIG.baseColor) as Theme;

  const triggerLabel = () => {
    const c = currentChartColor();
    return c === "match-theme" ? "Match theme" : (getLabel(c) ?? "");
  };

  const triggerStrip = () =>
    getActiveChartTuple({
      chartColor: currentChartColor(),
      theme: currentTheme(),
      baseColor: currentBaseColor(),
    });

  const matchThemeStrip = () =>
    getChartTuple(currentTheme()) ?? getChartTuple(currentBaseColor()) ?? ["", "", "", "", ""];

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={6} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent">
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Chart Color</div>
            <div class="font-medium text-foreground text-sm">{triggerLabel()}</div>
          </div>
          <ChartStrip chart={triggerStrip()} />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="no-scrollbar max-h-96 w-[calc(100svw-var(--spacing)*4)] md:w-52">
          <DropdownMenuRadioGroup
            value={currentChartColor()}
            onChange={(value) =>
              navigate({
                to: ".",
                search: (prev) => ({ ...prev, chartColor: value as ChartColor }),
              })
            }
          >
            {/* Match theme sentinel */}
            <DropdownMenuRadioItem value="match-theme">
              <div class="flex items-start gap-2">
                <ChartStrip chart={matchThemeStrip()} class="translate-y-1" />
                <span class="flex flex-col justify-start pointer-coarse:gap-1">
                  <span>{MATCH_THEME_ENTRY?.label ?? "Match theme"}</span>
                  <span class="pointer-coarse:text-sm text-muted-foreground text-xs">
                    Use theme's chart palette
                  </span>
                </span>
              </div>
            </DropdownMenuRadioItem>

            <DropdownMenuSeparator class="my-1" />

            {/* Base colors */}
            <For each={BASE_COLORS}>
              {(base) => (
                <DropdownMenuRadioItem value={base.name}>
                  <div class="flex items-center gap-2">
                    <ChartStrip chart={getChartTuple(base.name) ?? ["", "", "", "", ""]} />
                    <span class="text-sm">{base.label}</span>
                  </div>
                </DropdownMenuRadioItem>
              )}
            </For>

            <DropdownMenuSeparator class="my-1" />

            {/* Theme colors */}
            <For each={THEMES}>
              {(theme) => (
                <DropdownMenuRadioItem value={theme.name as ChartColor}>
                  <div class="flex items-center gap-2">
                    <ChartStrip
                      chart={getChartTuple(theme.name as ChartColor) ?? ["", "", "", "", ""]}
                    />
                    <span class="text-sm">{theme.label}</span>
                  </div>
                </DropdownMenuRadioItem>
              )}
            </For>

            {/* Spacer for the SELECTABLE_CHART_COLORS reference (keeps the
                full list available even if the BASE_COLORS/THEMES arrays drift
                out of sync with CHART_COLORS — render fallback strip only). */}
            <For
              each={SELECTABLE_CHART_COLORS.filter(
                (c) =>
                  !BASE_COLORS.some((b) => b.name === c.name) &&
                  !THEMES.some((t) => t.name === c.name),
              )}
            >
              {(extra) => (
                <DropdownMenuRadioItem value={extra.name}>
                  <div class="flex items-center gap-2">
                    <ChartStrip chart={extra.chart} />
                    <span class="text-sm">{extra.label}</span>
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
