import { TrendingUp } from "lucide-solid";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
} from "solid-recharts";
import { Example, ExampleWrapper } from "@/components/example";
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

const areaChartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
];

const areaChartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const barChartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const barChartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const lineChartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const lineChartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const pieChartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 287, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 190, fill: "var(--color-other)" },
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
  other: {
    label: "Other",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

const radarChartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const radarChartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const radialChartData = [{ browser: "safari", visitors: 1260, fill: "var(--color-safari)" }];

const radialChartConfig = {
  visitors: {
    label: "Visitors",
  },
  safari: {
    label: "Safari",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const totalVisitors = pieChartData.reduce((total, entry) => total + entry.visitors, 0);

export default function ChartExample() {
  return (
    <ExampleWrapper>
      <ChartAreaExample />
      <ChartBarExample />
      <ChartLineExample />
      <ChartPieExample />
      <ChartRadialExample />
      <ChartRadarExample />
    </ExampleWrapper>
  );
}

function ChartAreaExample() {
  return (
    <Example title="Area Chart">
      <Card class="w-full">
        <CardHeader>
          <CardTitle>Area Chart</CardTitle>
          <CardDescription>Showing total visitors for the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={areaChartConfig}>
            <AreaChart accessibilityLayer data={areaChartData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => String(value).slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={(contentProps) => (
                  <ChartTooltipContent {...contentProps} indicator="line" />
                )}
              />
              <Area
                dataKey="desktop"
                type="natural"
                fill="var(--color-desktop)"
                fillOpacity={0.4}
                stroke="var(--color-desktop)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <TrendFooter date="January - June 2024" />
        </CardFooter>
      </Card>
    </Example>
  );
}

function ChartBarExample() {
  return (
    <Example title="Bar Chart">
      <Card class="w-full">
        <CardHeader>
          <CardTitle>Bar Chart - Multiple</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barChartConfig}>
            <BarChart accessibilityLayer data={barChartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => String(value).slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={(contentProps) => (
                  <ChartTooltipContent {...contentProps} indicator="dashed" />
                )}
              />
              <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
              <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter class="flex-col items-start gap-2">
          <TrendText />
          <div class="leading-none text-muted-foreground">
            Showing total visitors for the last 6 months
          </div>
        </CardFooter>
      </Card>
    </Example>
  );
}

function ChartLineExample() {
  return (
    <Example title="Line Chart">
      <Card class="w-full">
        <CardHeader>
          <CardTitle>Line Chart - Multiple</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={lineChartConfig}>
            <LineChart accessibilityLayer data={lineChartData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => String(value).slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={(contentProps) => <ChartTooltipContent {...contentProps} />}
              />
              <Line
                dataKey="desktop"
                type="monotone"
                stroke="var(--color-desktop)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="mobile"
                type="monotone"
                stroke="var(--color-mobile)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <TrendFooter date="Showing total visitors for the last 6 months" />
        </CardFooter>
      </Card>
    </Example>
  );
}

function ChartPieExample() {
  return (
    <Example title="Pie Chart">
      <Card class="w-full">
        <CardHeader class="items-center pb-0">
          <CardTitle>Pie Chart - Donut with Text</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </CardHeader>
        <CardContent class="flex-1 pb-0">
          <ChartContainer config={pieChartConfig} class="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={(contentProps) => <ChartTooltipContent {...contentProps} hideLabel />}
              />
              <Pie
                data={pieChartData}
                dataKey="visitors"
                nameKey="browser"
                innerRadius={60}
                strokeWidth={5}
              >
                <Label
                  content={(labelProps) => {
                    const viewBox = labelProps.viewBox;
                    if (
                      viewBox &&
                      "cx" in viewBox &&
                      typeof viewBox.cx === "number" &&
                      typeof viewBox.cy === "number"
                    ) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          text-anchor="middle"
                          dominant-baseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            class="fill-foreground text-3xl font-bold"
                          >
                            {totalVisitors.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={viewBox.cy + 24} class="fill-muted-foreground">
                            Visitors
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter class="flex-col gap-2">
          <TrendText />
          <div class="leading-none text-muted-foreground">
            Showing total visitors for the last 6 months
          </div>
        </CardFooter>
      </Card>
    </Example>
  );
}

function ChartRadialExample() {
  return (
    <Example title="Radial Chart">
      <Card class="w-full">
        <CardHeader>
          <CardTitle>Radial Chart - Shape</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </CardHeader>
        <CardContent class="flex-1 pb-0">
          <ChartContainer config={radialChartConfig} class="mx-auto aspect-square max-h-[210px]">
            <RadialBarChart data={radialChartData} endAngle={100} innerRadius={64} outerRadius={94}>
              <PolarGrid
                gridType="circle"
                radialLines={false}
                stroke="none"
                class="first:fill-muted last:fill-background"
                polarRadius={[86, 74]}
              />
              <RadialBar dataKey="visitors" background />
              {/* Solid Recharts exposes the center label as an axis callback instead of a Label child. */}
              <PolarRadiusAxis
                tick={false}
                axisLine={false}
                label={(labelProps) => {
                  const viewBox = labelProps.viewBox;
                  if (
                    viewBox &&
                    "cx" in viewBox &&
                    typeof viewBox.cx === "number" &&
                    typeof viewBox.cy === "number"
                  ) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        text-anchor="middle"
                        dominant-baseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          class="fill-foreground text-4xl font-bold"
                        >
                          {radialChartData[0].visitors.toLocaleString()}
                        </tspan>
                        <tspan x={viewBox.cx} y={viewBox.cy + 24} class="fill-muted-foreground">
                          Visitors
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </RadialBarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter class="flex-col gap-2">
          <TrendText />
          <div class="leading-none text-muted-foreground">
            Showing total visitors for the last 6 months
          </div>
        </CardFooter>
      </Card>
    </Example>
  );
}

function ChartRadarExample() {
  return (
    <Example title="Radar Chart">
      <Card class="w-full">
        <CardHeader class="items-center pb-4">
          <CardTitle>Radar Chart - Multiple</CardTitle>
          <CardDescription>Showing total visitors for the last 6 months</CardDescription>
        </CardHeader>
        <CardContent class="pb-0">
          <ChartContainer config={radarChartConfig} class="mx-auto aspect-square max-h-[250px]">
            <RadarChart data={radarChartData}>
              <ChartTooltip
                cursor={false}
                content={(contentProps) => (
                  <ChartTooltipContent {...contentProps} indicator="line" />
                )}
              />
              <PolarAngleAxis dataKey="month" />
              <PolarGrid />
              <Radar dataKey="desktop" fill="var(--color-desktop)" fillOpacity={0.6} />
              <Radar dataKey="mobile" fill="var(--color-mobile)" />
            </RadarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter class="flex-col gap-2">
          <TrendText />
          <div class="flex items-center gap-2 leading-none text-muted-foreground">
            January - June 2024
          </div>
        </CardFooter>
      </Card>
    </Example>
  );
}

function TrendFooter(props: { date: string }) {
  return (
    <div class="flex w-full items-start gap-2">
      <div class="grid gap-2">
        <TrendText />
        <div class="flex items-center gap-2 leading-none text-muted-foreground">{props.date}</div>
      </div>
    </div>
  );
}

function TrendText() {
  return (
    <div class="flex items-center gap-2 leading-none font-medium">
      Trending up by 5.2% this month <TrendingUp class="size-4" />
    </div>
  );
}
