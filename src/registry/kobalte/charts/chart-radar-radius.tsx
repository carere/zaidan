import { TrendingUp } from "lucide-solid";
import { PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "solid-recharts";
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

export const description = "A radar chart with a radius axis";
const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];
const chartConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ChartRadarRadius() {
  return (
    <Card class="w-full">
      <CardHeader class="items-center pb-4">
        <CardTitle>Radar Chart - Radius Axis</CardTitle>
        <CardDescription>Showing total visitors for the last 6 months</CardDescription>
      </CardHeader>
      <CardContent class="pb-0">
        <ChartContainer config={chartConfig} class="mx-auto aspect-square max-h-[250px]">
          <RadarChart accessibilityLayer data={chartData}>
            <ChartTooltip
              cursor={false}
              content={(props) => (
                <ChartTooltipContent {...props} indicator="line" labelKey="month" />
              )}
            />
            <PolarGrid />
            <Radar dataKey="desktop" fill="var(--color-desktop)" fillOpacity={0.6} />
            <Radar dataKey="mobile" fill="var(--color-mobile)" />
            <PolarRadiusAxis
              angle={60}
              stroke="var(--foreground)"
              orientation="middle"
              axisLine={false}
            />
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
