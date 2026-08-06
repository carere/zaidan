import { Label, Pie, PieChart } from "solid-recharts";

import { Card, CardContent, CardFooter } from "@/registry/kobalte/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/registry/kobalte/ui/chart";
import { Separator } from "@/registry/kobalte/ui/separator";

const chartData = [
  { name: "saved", value: 24000, fill: "var(--color-saved)" },
  { name: "remaining", value: 6000, fill: "var(--color-remaining)" },
];

const chartConfig = {
  saved: {
    label: "Saved",
    color: "var(--chart-2)",
  },
  remaining: {
    label: "Remaining",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function SavingsProgress() {
  return (
    <Card>
      <CardContent>
        <ChartContainer config={chartConfig} class="mx-auto aspect-square max-h-[220px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={95}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        text-anchor="middle"
                        dominant-baseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 12}
                          class="fill-foreground text-2xl font-bold"
                        >
                          $24,000
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 12}
                          class="fill-muted-foreground text-xs"
                        >
                          80% of $30,000
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter class="flex-col gap-0">
        <div class="flex w-full items-center justify-between py-3">
          <span class="text-sm text-muted-foreground">Projected Finish</span>
          <span class="text-sm font-semibold">October 2024</span>
        </div>
        <Separator />
        <div class="flex w-full items-center justify-between py-3">
          <span class="text-sm text-muted-foreground">Monthly Average</span>
          <span class="text-sm font-semibold tabular-nums">$1,250</span>
        </div>
        <Separator />
        <div class="flex w-full items-center justify-between py-3">
          <span class="text-sm text-muted-foreground">Top Contributor</span>
          <span class="text-sm font-semibold">Auto-Transfer</span>
        </div>
      </CardFooter>
    </Card>
  );
}
