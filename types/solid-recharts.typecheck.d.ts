import type { Component, JSX } from "solid-js";

type DataKey = string | number;

type ChartMargin = {
  bottom?: number;
  left?: number;
  right?: number;
  top?: number;
};

type AreaProps = {
  dataKey: DataKey;
  fill?: string;
  fillOpacity?: number;
  stackId?: DataKey;
  stroke?: string;
  type?: "linear" | "natural" | "step";
};

type AreaChartProps = {
  accessibilityLayer?: boolean;
  children?: JSX.Element;
  data: ReadonlyArray<unknown>;
  margin?: ChartMargin;
  stackOffset?: "expand";
};

type DotProps = {
  cx?: number;
  cy?: number;
  fill?: string;
  r?: number;
  stroke?: string;
};

type DotItemDotProps = DotProps & {
  payload: unknown;
  value: unknown;
};

type LineProps = {
  activeDot?: { r?: number };
  dataKey: DataKey;
  dot?: boolean | Partial<DotProps> | ((props: DotItemDotProps) => JSX.Element);
  stroke?: string;
  strokeWidth?: number;
  type?: "linear" | "monotone" | "natural" | "step";
};

type LineChartProps = {
  accessibilityLayer?: boolean;
  children?: JSX.Element;
  data: ReadonlyArray<unknown>;
  margin?: ChartMargin;
};

type BarProps = {
  children?: JSX.Element;
  dataKey: DataKey;
  fill?: string;
  radius?: number | readonly [number, number, number, number];
  shape?: (props: BarShapeProps) => JSX.Element;
  stackId?: DataKey;
  strokeWidth?: number;
};

type BarChartProps = {
  accessibilityLayer?: boolean;
  children?: JSX.Element;
  data: ReadonlyArray<unknown>;
  layout?: "horizontal" | "vertical";
  margin?: ChartMargin;
};

type CartesianGridProps = {
  horizontal?: boolean;
  vertical?: boolean;
};

export type BarShapeProps = {
  fill?: string;
  fillOpacity?: number;
  height?: number;
  index?: number;
  payload?: unknown;
  stroke?: string;
  width?: number;
  x?: number;
  y?: number;
};

type CellProps = {
  fill?: string;
};

type LabelListProps = {
  class?: string;
  dataKey?: DataKey;
  fillOpacity?: number;
  fontSize?: number;
  offset?: number;
  position?: string;
};

type RectangleProps = BarShapeProps & {
  strokeDasharray?: number | string;
  strokeDashoffset?: number | string;
};

type RadarProps = {
  dataKey: DataKey;
  dot?: { fillOpacity?: number; r?: number };
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
};

type RadarChartProps = {
  accessibilityLayer?: boolean;
  children?: JSX.Element;
  data: ReadonlyArray<unknown>;
  margin?: ChartMargin;
};

export type PolarAngleTickContentProps = {
  index: number;
  textAnchor?: "start" | "middle" | "end" | "inherit";
  x: number;
  y: number;
};

type PolarAngleAxisProps = {
  dataKey?: DataKey;
  tick?: (props: PolarAngleTickContentProps) => JSX.Element;
};

type PolarGridProps = {
  class?: string;
  gridType?: "polygon" | "circle";
  polarRadius?: ReadonlyArray<number>;
  radialLines?: boolean;
  strokeWidth?: number;
};

type PolarRadiusAxisProps = {
  angle?: number;
  axisLine?: boolean;
  orientation?: "left" | "right" | "middle";
  stroke?: string;
};

type ResponsiveContainerProps = {
  children?: JSX.Element;
  initialDimension?: {
    height: number;
    width: number;
  };
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

export type TooltipProps = {
  content?: (props: TooltipContentProps) => JSX.Element;
  cursor?: boolean;
  defaultIndex?: number | string;
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

export type LegendProps = {
  content?: (props: {
    payload?: ReadonlyArray<LegendPayload>;
    verticalAlign?: "top" | "middle" | "bottom";
  }) => JSX.Element;
  verticalAlign?: "top" | "middle" | "bottom";
};

type AxisProps = {
  axisLine?: boolean;
  dataKey?: DataKey;
  hide?: boolean;
  minTickGap?: number;
  tickCount?: number;
  tickFormatter?: (value: unknown) => string;
  tickLine?: boolean;
  tickMargin?: number;
  type?: "number" | "category";
};

export const Area: Component<AreaProps>;
export const AreaChart: Component<AreaChartProps>;
export const Bar: Component<BarProps>;
export const BarChart: Component<BarChartProps>;
export const CartesianGrid: Component<CartesianGridProps>;
export const Cell: Component<CellProps>;
export const Dot: Component<DotProps>;
export const LabelList: Component<LabelListProps>;
export const Legend: Component<LegendProps>;
export const Line: Component<LineProps>;
export const LineChart: Component<LineChartProps>;
export const PolarAngleAxis: Component<PolarAngleAxisProps>;
export const PolarGrid: Component<PolarGridProps>;
export const PolarRadiusAxis: Component<PolarRadiusAxisProps>;
export const Radar: Component<RadarProps>;
export const RadarChart: Component<RadarChartProps>;
export const Rectangle: Component<RectangleProps>;
export const ResponsiveContainer: Component<ResponsiveContainerProps>;
export const Tooltip: Component<TooltipProps>;
export const XAxis: Component<AxisProps>;
export const YAxis: Component<AxisProps>;
