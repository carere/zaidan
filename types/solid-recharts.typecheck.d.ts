import type { Component, JSX } from "solid-js";

type ChartPrimitiveProps = Record<string, unknown> & {
  children?: JSX.Element;
};

export type TooltipPayloadEntry = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  payload?: unknown;
  type?: string;
  value?: string | number | ReadonlyArray<string | number>;
};

export type TooltipContentProps = {
  active?: boolean;
  label?: unknown;
  payload?: ReadonlyArray<TooltipPayloadEntry>;
};

export type TooltipProps = ChartPrimitiveProps & {
  content?: (props: TooltipContentProps) => JSX.Element;
  formatter?: (
    value: TooltipPayloadEntry["value"],
    name: TooltipPayloadEntry["name"],
    item: TooltipPayloadEntry,
    index: number,
    payload: ReadonlyArray<TooltipPayloadEntry>,
  ) => JSX.Element;
  labelFormatter?: (label: unknown, payload: ReadonlyArray<TooltipPayloadEntry>) => JSX.Element;
};

export type LegendPayload = {
  color?: string;
  dataKey?: string | number;
  inactive?: boolean;
  payload?: unknown;
  type?: string;
  value?: string | number;
};

export type LegendProps = ChartPrimitiveProps & {
  content?: (props: {
    payload?: ReadonlyArray<LegendPayload>;
    verticalAlign?: "top" | "middle" | "bottom";
  }) => JSX.Element;
  verticalAlign?: "top" | "middle" | "bottom";
};

type AxisProps = ChartPrimitiveProps & {
  tickFormatter?: (value: unknown) => string;
};

export const Area: Component<ChartPrimitiveProps>;
export const AreaChart: Component<ChartPrimitiveProps>;
export const CartesianGrid: Component<ChartPrimitiveProps>;
export const Legend: Component<LegendProps>;
export const ResponsiveContainer: Component<ChartPrimitiveProps>;
export const Tooltip: Component<TooltipProps>;
export const XAxis: Component<AxisProps>;
export const YAxis: Component<AxisProps>;
