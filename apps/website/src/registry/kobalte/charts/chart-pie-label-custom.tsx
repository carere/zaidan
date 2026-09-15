import { TrendingUp } from "lucide-solid";
import { Pie, PieChart, type PieLabelRenderProps } from "solid-recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/registry/kobalte/ui/chart";

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 90, fill: "var(--color-other)" },
];

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  chrome: {
    label: "Chrome",
    color: "var(--chart-1)",
  },
  safari: {
    label: "Safari",
    color: "var(--chart-2)",
  },
  firefox: {
    label: "Firefox",
    color: "var(--chart-3)",
  },
  edge: {
    label: "Edge",
    color: "var(--chart-4)",
  },
  other: {
    label: "Other",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function ChartPieLabelCustom() {
  return (
    <Card class="flex flex-col">
      <CardHeader class="items-center pb-0">
        <CardTitle>Pie Chart - Custom Label</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent class="flex-1 pb-0">
        <ChartContainer config={chartConfig} class="mx-auto aspect-square max-h-[250px] px-0">
          <PieChart>
            <ChartTooltip
              content={(contentProps) => (
                <ChartTooltipContent {...contentProps} nameKey="visitors" hideLabel />
              )}
            />
            <Pie
              data={chartData}
              dataKey="visitors"
              labelLine={false}
              label={(labelProps: PieLabelRenderProps) => {
                const payload = labelProps.payload;
                const visitors =
                  typeof payload === "object" && payload !== null && "visitors" in payload
                    ? payload.visitors
                    : undefined;
                const anchor =
                  labelProps.textAnchor === "start" || labelProps.textAnchor === "end"
                    ? labelProps.textAnchor
                    : "middle";
                return (
                  // Deviation: `dominantBaseline` is not part of the port's
                  // PieLabelRenderProps, so it is omitted here.
                  <text
                    x={labelProps.x}
                    y={labelProps.y}
                    text-anchor={anchor}
                    fill="var(--foreground)"
                  >
                    {typeof visitors === "number" ? visitors : null}
                  </text>
                );
              }}
              nameKey="browser"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter class="flex-col gap-2 text-sm">
        <div class="flex items-center gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp class="h-4 w-4" />
        </div>
        <div class="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  );
}
