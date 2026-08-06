import { Label, Pie, PieChart } from "solid-recharts";

import { Badge } from "@/registry/kobalte/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/registry/kobalte/ui/chart";
import { Progress } from "@/registry/kobalte/ui/progress";

const pieChartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 287, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
];

const pieChartConfig = {
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
} satisfies ChartConfig;

export function PieChartCard() {
  const totalVisitors = pieChartData.reduce((sum, item) => sum + item.visitors, 0);
  const topBrowser = pieChartData.reduce((max, item) =>
    item.visitors > max.visitors ? item : max,
  );
  const topBrowserShare = Math.round((topBrowser.visitors / totalVisitors) * 100);
  const topBrowserLabel =
    pieChartConfig[topBrowser.browser as keyof typeof pieChartConfig]?.label ?? "Top";

  return (
    <Card>
      <CardHeader class="pb-0">
        <CardTitle>Browser Share</CardTitle>
        <CardDescription>January - June 2026</CardDescription>
        <CardAction>
          <Badge variant="outline">{topBrowserLabel}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent class="pt-0">
        <ChartContainer config={pieChartConfig} class="mx-auto aspect-square max-h-[190px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={pieChartData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={50}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="red"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy - 16}
                          class="fill-foreground text-2xl font-bold"
                        >
                          {totalVisitors.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 4}
                          class="fill-muted-foreground text-xs"
                        >
                          Visitors
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="browser" />} class="translate-y-2" />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter class="flex-col items-stretch gap-2">
        <div class="flex items-center text-xs">
          <span class="font-medium">{topBrowserLabel}</span>
          <span class="ml-auto text-muted-foreground tabular-nums">{topBrowserShare}%</span>
        </div>
        <Progress
          value={topBrowserShare}
          aria-label={`${topBrowserLabel} browser share`}
          class="**:data-[slot=progress-indicator]:bg-chart-3"
        />
      </CardFooter>
    </Card>
  );
}
