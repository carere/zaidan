import type { Component, ComponentProps, JSX } from "solid-js";
import {
  createContext,
  createMemo,
  createUniqueId,
  For,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  type LegendPayload,
  type LegendProps,
  ResponsiveContainer,
  Legend as SolidRechartsLegend,
  Tooltip as SolidRechartsTooltip,
  type TooltipContentProps,
  type TooltipPayloadEntry,
  type TooltipProps,
} from "solid-recharts";
import { cn } from "@/lib/utils";

const THEMES = {
  light: "",
  dark: '[data-kb-theme="dark"]',
} as const;

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;

export type ChartConfig = Record<
  string,
  {
    label?: JSX.Element;
    icon?: Component;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = createContext<ChartContextValue>();

function useChart() {
  const context = useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

type ChartContainerProps = ComponentProps<"div"> & {
  config: ChartConfig;
  initialDimension?: {
    width: number;
    height: number;
  };
};

function ChartContainer(props: ChartContainerProps) {
  const [local, others] = splitProps(props, [
    "id",
    "class",
    "children",
    "config",
    "initialDimension",
  ]);
  const uniqueId = createUniqueId();
  const chartId = () => `chart-${local.id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config: local.config }}>
      <div
        data-slot="chart"
        data-chart={chartId()}
        class={cn(
          "cn-chart flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          local.class,
        )}
        {...others}
      >
        <ChartStyle id={chartId()} config={local.config} />
        <ResponsiveContainer initialDimension={local.initialDimension ?? INITIAL_DIMENSION}>
          {local.children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle(props: { id: string; config: ChartConfig }) {
  const colorConfig = createMemo(() =>
    Object.entries(props.config).filter(([, config]) => config.theme ?? config.color),
  );

  const css = createMemo(() =>
    Object.entries(THEMES)
      .map(([theme, prefix]) => {
        const variables = colorConfig()
          .map(([key, itemConfig]) => {
            const color =
              itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color;
            return color ? `  --color-${key}: ${color};` : null;
          })
          .filter(Boolean)
          .join("\n");

        return `${prefix} [data-chart="${props.id}"] {\n${variables}\n}`;
      })
      .join("\n"),
  );

  return <Show when={colorConfig().length}>{<style>{css()}</style>}</Show>;
}

const ChartTooltip = SolidRechartsTooltip;

type ChartTooltipContentProps = ComponentProps<"div"> & {
  active?: TooltipContentProps["active"];
  payload?: ReadonlyArray<TooltipPayloadEntry>;
  label?: TooltipContentProps["label"];
  labelFormatter?: TooltipProps["labelFormatter"];
  formatter?: TooltipProps["formatter"];
  indicator?: "line" | "dot" | "dashed";
  hideLabel?: boolean;
  hideIndicator?: boolean;
  color?: string;
  nameKey?: string;
  labelKey?: string;
  labelClass?: string;
};

function ChartTooltipContent(props: ChartTooltipContentProps) {
  const [local, others] = splitProps(props, [
    "active",
    "payload",
    "class",
    "indicator",
    "hideLabel",
    "hideIndicator",
    "label",
    "labelFormatter",
    "formatter",
    "color",
    "nameKey",
    "labelKey",
    "labelClass",
  ]);
  const { config } = useChart();

  const tooltipLabel = createMemo(() => {
    if (local.hideLabel || !local.payload?.length) {
      return null;
    }

    const [item] = local.payload;
    const key = `${local.labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !local.labelKey && typeof local.label === "string"
        ? (config[local.label]?.label ?? local.label)
        : itemConfig?.label;

    if (local.labelFormatter) {
      return (
        <div class={cn("font-medium", local.labelClass)}>
          {local.labelFormatter(value, local.payload)}
        </div>
      );
    }

    if (value == null) {
      return null;
    }

    return <div class={cn("font-medium", local.labelClass)}>{value}</div>;
  });

  const visiblePayload = createMemo(() =>
    (local.payload ?? []).filter((item) => item?.type !== "none"),
  );

  return (
    <Show when={local.active && visiblePayload().length}>
      <div
        class={cn(
          "cn-chart-tooltip grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          local.class,
        )}
        {...others}
      >
        <Show when={visiblePayload().length !== 1 || (local.indicator ?? "dot") === "dot"}>
          {tooltipLabel()}
        </Show>
        <div class="grid gap-1.5">
          <For each={visiblePayload()}>
            {(item, index) => {
              const key = () => `${local.nameKey ?? item.name ?? item.dataKey ?? "value"}`;
              const itemConfig = () => getPayloadConfigFromPayload(config, item, key());
              const indicator = () => local.indicator ?? "dot";
              const nestLabel = () => visiblePayload().length === 1 && indicator() !== "dot";
              const indicatorColor = () =>
                local.color ?? getStringProperty(item.payload, "fill") ?? item.color;

              return (
                <div
                  class={cn(
                    "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                    indicator() === "dot" && "items-center",
                  )}
                >
                  {local.formatter && item.value !== undefined && item.name !== undefined ? (
                    local.formatter(item.value, item.name, item, index(), local.payload ?? [])
                  ) : (
                    <>
                      <Show
                        when={itemConfig()?.icon}
                        fallback={
                          <Show when={!local.hideIndicator}>
                            <div
                              class={cn(
                                "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                                indicator() === "dot" && "h-2.5 w-2.5",
                                indicator() === "line" && "w-1",
                                indicator() === "dashed" &&
                                  "w-0 border-[1.5px] border-dashed bg-transparent",
                                nestLabel() && indicator() === "dashed" && "my-0.5",
                              )}
                              style={
                                {
                                  "--color-bg": indicatorColor(),
                                  "--color-border": indicatorColor(),
                                } as JSX.CSSProperties
                              }
                            />
                          </Show>
                        }
                      >
                        {(icon) => <Dynamic component={icon()} />}
                      </Show>
                      <div
                        class={cn(
                          "flex flex-1 justify-between leading-none",
                          nestLabel() ? "items-end" : "items-center",
                        )}
                      >
                        <div class="grid gap-1.5">
                          <Show when={nestLabel()}>{tooltipLabel()}</Show>
                          <span class="text-muted-foreground">
                            {itemConfig()?.label ?? item.name}
                          </span>
                        </div>
                        <Show when={item.value != null}>
                          <span class="font-medium font-mono text-foreground tabular-nums">
                            {typeof item.value === "number"
                              ? item.value.toLocaleString()
                              : String(item.value)}
                          </span>
                        </Show>
                      </div>
                    </>
                  )}
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </Show>
  );
}

const ChartLegend = SolidRechartsLegend;

type ChartLegendContentProps = ComponentProps<"div"> & {
  payload?: ReadonlyArray<LegendPayload>;
  verticalAlign?: LegendProps["verticalAlign"];
  hideIcon?: boolean;
  nameKey?: string;
};

function ChartLegendContent(props: ChartLegendContentProps) {
  const [local, others] = splitProps(props, [
    "class",
    "payload",
    "verticalAlign",
    "hideIcon",
    "nameKey",
  ]);
  const { config } = useChart();
  const visiblePayload = createMemo(() =>
    (local.payload ?? []).filter((item) => item.type !== "none"),
  );

  return (
    <Show when={visiblePayload().length}>
      <div
        class={cn(
          "flex items-center justify-center gap-4",
          local.verticalAlign === "top" ? "pb-3" : "pt-3",
          local.class,
        )}
        {...others}
      >
        <For each={visiblePayload()}>
          {(item) => {
            const key = () => `${local.nameKey ?? item.dataKey ?? "value"}`;
            const itemConfig = () => getPayloadConfigFromPayload(config, item, key());

            return (
              <div class="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground">
                <Show
                  when={itemConfig()?.icon && !local.hideIcon ? itemConfig()?.icon : undefined}
                  fallback={
                    <div
                      class="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ "background-color": item.color }}
                    />
                  }
                >
                  {(icon) => <Dynamic component={icon()} />}
                </Show>
                {itemConfig()?.label}
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
): ChartConfig[string] | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined;

  const payloadValue = getStringProperty(payload, key);
  const nestedPayloadValue = getStringProperty(payloadPayload, key);
  const configLabelKey = payloadValue ?? nestedPayloadValue ?? key;

  return config[configLabelKey] ?? config[key];
}

function getStringProperty(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }

  const property = value[key as keyof typeof value];
  return typeof property === "string" ? property : undefined;
}

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
};
