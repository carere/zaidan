import { createFileRoute, notFound } from "@tanstack/solid-router";
import { For } from "solid-js";
import { ChartDisplay } from "@/components/chart-display";
import { charts, chartTypeLabel, isChartType } from "@/lib/charts";

export const Route = createFileRoute("/_public/charts/$type")({
  loader: ({ params }) => {
    if (!isChartType(params.type)) throw notFound();
    return params.type;
  },
  component: ChartCategoryPage,
});

function ChartCategoryPage() {
  const type = Route.useLoaderData();

  return (
    <section aria-labelledby="chart-category-heading">
      <h2 id="chart-category-heading" class="sr-only">
        {chartTypeLabel(type())}
      </h2>
      <div class="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3 xl:gap-8">
        <For each={charts[type()]}>
          {(chart) => (
            <ChartDisplay
              chart={chart}
              class={chart.fullWidth ? "md:col-span-2 lg:col-span-3" : undefined}
            />
          )}
        </For>
      </div>
    </section>
  );
}
