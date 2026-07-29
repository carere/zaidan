import { ArrowDownFromLine, ArrowUpFromLine, TrendingUp } from "lucide-solid";
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/registry/kobalte/ui/chart";

export const description = "A radar chart with icons";
const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];
const chartConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)", icon: ArrowDownFromLine },
  mobile: { label: "Mobile", color: "var(--chart-2)", icon: ArrowUpFromLine },
} satisfies ChartConfig;

export function ChartRadarIcons() {
  return (
    <Card class="w-full">
      <CardHeader class="items-center pb-4">
        <CardTitle>Radar Chart - Icons</CardTitle>
        <CardDescription>Showing total visitors for the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} class="mx-auto aspect-square max-h-[250px]">
          <RadarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: -40, bottom: -10, left: 0, right: 0 }}
          >
            <ChartTooltip
              cursor={false}
              content={(props) => <ChartTooltipContent {...props} indicator="line" />}
            />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid />
            <Radar dataKey="desktop" fill="var(--color-desktop)" fillOpacity={0.6} />
            <Radar dataKey="mobile" fill="var(--color-mobile)" />
            <ChartLegend
              content={(props) => (
                <ChartLegendContent
                  class="mt-8"
                  payload={props.payload}
                  verticalAlign={props.verticalAlign}
                />
              )}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter class="flex-col gap-2 pt-4 text-sm">
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
