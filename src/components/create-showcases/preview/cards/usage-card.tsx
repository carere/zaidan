import { Card, CardContent, CardHeader, CardTitle } from "@/registry/kobalte/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/kobalte/ui/item";

// Usage items with percentage and value.
const items = [
  {
    name: "Edge Requests",
    value: "$1.83K",
    percentage: 67.34,
  },
  {
    name: "Fast Data Transfer",
    percentage: 52.18,
    value: "$952.51",
  },
  {
    name: "Monitoring data points",
    percentage: 89.42,
    value: "$901.20",
  },
  {
    name: "Web Analytics Events",
    percentage: 45.67,
    value: "$603.71",
  },
  {
    name: "ISR Writes",
    percentage: 26.23,
    value: "524.52K / 2M",
  },
  {
    name: "Function Duration",
    percentage: 5.11,
    value: "5.11 GB Hrs / 1K GB Hrs",
  },
];

// Circular gauge SVG component for displaying a percentage.
function CircularGauge(props: { percentage: number }) {
  const normalizedPercentage = Math.min(Math.max(props.percentage, 0), 100);
  const circumference = 2 * Math.PI * 42.5;
  const strokePercent = (normalizedPercentage / 100) * circumference;

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      width="16"
      strokeWidth="2"
      viewBox="0 0 100 100"
      class="-rotate-90"
    >
      <circle
        cx="50"
        cy="50"
        r="42.5"
        strokeWidth="12"
        strokeDashoffset="0"
        strokeLinecap="round"
        strokeLinejoin="round"
        class="opacity-20"
        stroke="currentColor"
        style={{
          strokeDasharray: `${circumference} ${circumference}`,
        }}
      />
      <circle
        cx="50"
        cy="50"
        r="42.5"
        strokeWidth="12"
        strokeDashoffset="0"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
        class="transition-all duration-300"
        style={{
          strokeDasharray: `${strokePercent} ${circumference}`,
        }}
      />
    </svg>
  );
}

export function UsageCard() {
  return (
    <Card class="w-full max-w-sm gap-4">
      <CardHeader>
        <CardTitle class="px-1 text-sm">5 days remaining in cycle</CardTitle>
      </CardHeader>
      <CardContent>
        <ItemGroup role="group" class="gap-0">
          <For each={items}>
            {(item) => (
              <Item size="xs" class="px-0 group-hover/item-group:bg-transparent" as="a" href="/">
                <ItemMedia variant="icon" class="text-primary">
                  <CircularGauge percentage={item.percentage} />
                </ItemMedia>
                <ItemContent class="inline-block truncate">
                  <ItemTitle class="inline">{item.name}</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <span class="font-mono text-xs font-medium text-muted-foreground tabular-nums">
                    {item.value}
                  </span>
                </ItemActions>
              </Item>
            )}
          </For>
        </ItemGroup>
      </CardContent>
    </Card>
  );
}

import { For } from "solid-js";
