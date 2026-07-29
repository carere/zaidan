import { TrendingUp } from "lucide-solid";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "solid-recharts";
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

export const description = "A radar chart with a grid filled";
const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 285 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 203 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 264 },
];
const chartConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function ChartRadarGridFill() {
  return (
    <Card class="w-full">
      <CardHeader class="items-center pb-4">
        <CardTitle>Radar Chart - Grid Filled</CardTitle>
        <CardDescription>Showing total visitors for the last 6 months</CardDescription>
      </CardHeader>
      <CardContent class="pb-0">
        <ChartContainer config={chartConfig} class="mx-auto aspect-square max-h-[250px]">
          <RadarChart accessibilityLayer data={chartData}>
            <ChartTooltip
              cursor={false}
              content={(props) => <ChartTooltipContent {...props} hideLabel />}
            />
            <PolarGrid class="fill-(--color-desktop) opacity-20" />
            <PolarAngleAxis dataKey="month" />
            <Radar dataKey="desktop" fill="var(--color-desktop)" fillOpacity={0.5} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter class="flex-col gap-2 text-sm">
        <div class="flex items-center gap-2 font-medium leading-none">
          Trending up by 5.2% this month <TrendingUp class="size-4" />
        </div>
        <div class="flex items-center gap-2 text-muted-foreground leading-none">
          January - June 2024
        </div>
      </CardFooter>
    </Card>
  );
}
