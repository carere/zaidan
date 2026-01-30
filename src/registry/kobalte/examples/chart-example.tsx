import type { ECBasicOption } from "echarts/types/dist/shared";
import { Example, ExampleWrapper } from "@/components/example";
import {
  type ChartConfig,
  ChartContainer,
  chartColors,
  chartGridDefaults,
  chartLegendDefaults,
  chartTooltipDefaults,
  chartXAxisDefaults,
  chartYAxisDefaults,
} from "@/registry/kobalte/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

export default function ChartExample() {
  return (
    <ExampleWrapper>
      <ChartAreaExample />
      <ChartBarExample />
      <ChartLineExample />
      <ChartPieExample />
      <ChartRadarExample />
    </ExampleWrapper>
  );
}

// Sample data for charts
const monthlyData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const chartConfig: ChartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
};

function ChartAreaExample() {
  const option: ECBasicOption = {
    color: chartColors,
    tooltip: {
      ...chartTooltipDefaults,
      trigger: "axis" as const,
    },
    grid: {
      ...chartGridDefaults,
      bottom: "15%",
    },
    xAxis: {
      ...chartXAxisDefaults,
      type: "category" as const,
      data: monthlyData.map((d) => d.month.slice(0, 3)),
      boundaryGap: false,
    },
    yAxis: {
      ...chartYAxisDefaults,
      axisLabel: {
        show: false,
      },
    },
    series: [
      {
        name: "Desktop",
        type: "line" as const,
        data: monthlyData.map((d) => d.desktop),
        smooth: true,
        areaStyle: {
          opacity: 0.3,
        },
        lineStyle: {
          width: 2,
        },
        emphasis: { disabled: true },
      },
    ],
  };

  return (
    <Example title="Area Chart">
      <Card class="w-full">
        <CardHeader>
          <CardTitle>Area Chart - Stacked</CardTitle>
          <CardDescription>Showing total visitors for the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer option={option} config={chartConfig} class="h-[300px] w-full" />
        </CardContent>
      </Card>
    </Example>
  );
}

function ChartBarExample() {
  const option = {
    color: chartColors,
    tooltip: {
      ...chartTooltipDefaults,
      trigger: "axis" as const,
    },
    grid: {
      ...chartGridDefaults,
      bottom: "15%",
    },
    xAxis: {
      ...chartXAxisDefaults,
      type: "category" as const,
      data: monthlyData.map((d) => d.month.slice(0, 3)),
    },
    yAxis: {
      ...chartYAxisDefaults,
      axisLabel: {
        show: false,
      },
    },
    series: [
      {
        name: "Desktop",
        type: "bar" as const,
        data: monthlyData.map((d) => d.desktop),
        barWidth: "40%",
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
        },
        // Disable emphasis to prevent flickering when using CSS variables
        // ECharts can't calculate emphasis colors from CSS variables
        emphasis: { disabled: true },
      },
      {
        name: "Mobile",
        type: "bar" as const,
        data: monthlyData.map((d) => d.mobile),
        barWidth: "40%",
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: { disabled: true },
      },
    ],
  };

  return (
    <Example title="Bar Chart">
      <Card class="w-full">
        <CardHeader>
          <CardTitle>Bar Chart - Multiple</CardTitle>
          <CardDescription>January - June 2024</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer option={option} config={chartConfig} class="h-[300px] w-full" />
        </CardContent>
      </Card>
    </Example>
  );
}

function ChartLineExample() {
  const option = {
    color: chartColors,
    tooltip: {
      ...chartTooltipDefaults,
      trigger: "axis" as const,
    },
    legend: {
      ...chartLegendDefaults,
      data: ["Desktop", "Mobile"],
      bottom: 0,
    },
    grid: {
      ...chartGridDefaults,
      bottom: "15%",
    },
    xAxis: {
      ...chartXAxisDefaults,
      type: "category" as const,
      data: monthlyData.map((d) => d.month.slice(0, 3)),
      boundaryGap: false,
    },
    yAxis: {
      ...chartYAxisDefaults,
      type: "value" as const,
    },
    series: [
      {
        name: "Desktop",
        type: "line" as const,
        data: monthlyData.map((d) => d.desktop),
        smooth: true,
        symbolSize: 8,
        lineStyle: {
          width: 2,
        },
        emphasis: { disabled: true },
      },
      {
        name: "Mobile",
        type: "line" as const,
        data: monthlyData.map((d) => d.mobile),
        smooth: true,
        symbolSize: 8,
        lineStyle: {
          width: 2,
        },
        emphasis: { disabled: true },
      },
    ],
  };

  return (
    <Example title="Line Chart">
      <Card class="w-full">
        <CardHeader>
          <CardTitle>Line Chart</CardTitle>
          <CardDescription>Showing total visitors for the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer option={option} config={chartConfig} class="h-[300px] w-full" />
        </CardContent>
      </Card>
    </Example>
  );
}

function ChartPieExample() {
  const pieData = [
    { name: "Chrome", value: 275 },
    { name: "Safari", value: 200 },
    { name: "Firefox", value: 287 },
    { name: "Edge", value: 173 },
    { name: "Other", value: 190 },
  ];

  const pieConfig: ChartConfig = {
    Chrome: { label: "Chrome", color: "var(--chart-1)" },
    Safari: { label: "Safari", color: "var(--chart-2)" },
    Firefox: { label: "Firefox", color: "var(--chart-3)" },
    Edge: { label: "Edge", color: "var(--chart-4)" },
    Other: { label: "Other", color: "var(--chart-5)" },
  };

  const option = {
    color: chartColors,
    tooltip: {
      trigger: "item" as const,
      backgroundColor: "var(--background)",
      borderColor: "var(--border)",
      borderWidth: 1,
      textStyle: {
        color: "var(--foreground)",
        fontSize: 12,
      },
    },
    legend: {
      ...chartLegendDefaults,
      orient: "horizontal" as const,
      bottom: 0,
    },
    series: [
      {
        name: "Visitors",
        type: "pie" as const,
        radius: ["40%", "70%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: "var(--background)",
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        // Disable emphasis to prevent flickering when using CSS variables
        emphasis: { disabled: true },
        labelLine: {
          show: false,
        },
        data: pieData,
      },
    ],
  };

  return (
    <Example title="Pie Chart">
      <Card class="w-full">
        <CardHeader>
          <CardTitle>Pie Chart - Donut</CardTitle>
          <CardDescription>Browser usage for the last month</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer option={option} config={pieConfig} class="h-[300px] w-full" />
        </CardContent>
      </Card>
    </Example>
  );
}

function ChartRadarExample() {
  const radarIndicators = [
    { name: "Sales", max: 100 },
    { name: "Admin", max: 100 },
    { name: "Tech", max: 100 },
    { name: "Support", max: 100 },
    { name: "Dev", max: 100 },
    { name: "Marketing", max: 100 },
  ];

  const option = {
    color: chartColors,
    tooltip: {
      trigger: "item" as const,
      backgroundColor: "var(--background)",
      borderColor: "var(--border)",
      borderWidth: 1,
      textStyle: {
        color: "var(--foreground)",
        fontSize: 12,
      },
    },
    legend: {
      ...chartLegendDefaults,
      data: ["Team A", "Team B"],
      bottom: 0,
    },
    radar: {
      indicator: radarIndicators,
      shape: "polygon" as const,
      axisName: {
        color: "var(--muted-foreground)",
      },
      splitLine: {
        lineStyle: {
          color: "var(--border)",
        },
      },
      splitArea: {
        show: false,
      },
      axisLine: {
        lineStyle: {
          color: "var(--border)",
        },
      },
    },
    series: [
      {
        type: "radar" as const,
        emphasis: { disabled: true },
        data: [
          {
            name: "Team A",
            value: [80, 50, 70, 84, 60, 55],
            areaStyle: {
              opacity: 0.3,
            },
          },
          {
            name: "Team B",
            value: [60, 75, 90, 40, 85, 70],
            areaStyle: {
              opacity: 0.3,
            },
          },
        ],
      },
    ],
  };

  return (
    <Example title="Radar Chart">
      <Card class="w-full">
        <CardHeader>
          <CardTitle>Radar Chart</CardTitle>
          <CardDescription>Team performance comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer option={option} class="h-[300px] w-full" />
        </CardContent>
      </Card>
    </Example>
  );
}
