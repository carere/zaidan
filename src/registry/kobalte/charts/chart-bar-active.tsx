import { TrendingUp } from "lucide-solid";
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis } from "solid-recharts";
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
  { browser: "chrome", visitors: 187, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 275, fill: "var(--color-firefox)" },
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

const ACTIVE_INDEX = 2;

// Resolve the config label for an axis tick value (no `as` casts).
function configLabel(value: unknown): string {
  const config: ChartConfig = chartConfig;
  const label = config[String(value)]?.label;
  return typeof label === "string" ? label : String(value);
}

// Read the `fill` the data row carries (payload is `unknown` in the port).
function payloadFill(payload: unknown): string | undefined {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "fill" in payload &&
    typeof payload.fill === "string"
  ) {
    return payload.fill;
  }
  return undefined;
}

export function ChartBarActive() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bar Chart - Active</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="browser"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => configLabel(value)}
            />
            <ChartTooltip
              cursor={false}
              content={(contentProps) => <ChartTooltipContent {...contentProps} hideLabel />}
            />
            <Bar
              dataKey="visitors"
              strokeWidth={2}
              radius={8}
              shape={(shapeProps) => (
                // Fragment-wrapped so the index read happens in the tracked
                // insert, not the untracked callback body (STRICT_READ).
                <>
                  {shapeProps.index === ACTIVE_INDEX ? (
                    <Rectangle
                      {...shapeProps}
                      fillOpacity={0.8}
                      stroke={payloadFill(shapeProps.payload)}
                      strokeDasharray={4}
                      strokeDashoffset={4}
                    />
                  ) : (
                    <Rectangle {...shapeProps} />
                  )}
                </>
              )}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter class="flex-col items-start gap-2 text-sm">
        <div class="flex gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp class="h-4 w-4" />
        </div>
        <div class="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  );
}
