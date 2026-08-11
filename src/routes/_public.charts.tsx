import { createFileRoute, Link, Outlet } from "@tanstack/solid-router";
import { ChartsNav } from "@/components/charts-nav";
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/page-header";
import { createPageHead } from "@/lib/seo";
import { Button } from "@/registry/kobalte/ui/button";

const title = "Beautiful Charts & Graphs";
const description =
  "A collection of ready-to-use chart components built with Solid Recharts. From basic charts to rich data displays, copy and paste them into your apps.";

export const Route = createFileRoute("/_public/charts")({
  head: () => createPageHead({ title, description, path: "/charts" }),
  component: ChartsLayout,
});

function ChartsLayout() {
  return (
    <>
      <PageHeader>
        <PageHeaderHeading>{title}</PageHeaderHeading>
        <PageHeaderDescription>{description}</PageHeaderDescription>
        <PageActions>
          <Button as="a" href="#charts" size="sm">
            Browse charts
          </Button>
          <Button
            as={Link}
            to="/docs/components/$primitive/$slug"
            // @ts-expect-error Kobalte's polymorphic wrapper cannot infer TanStack route params.
            params={{ primitive: "kobalte", slug: "chart" }}
            variant="ghost"
            size="sm"
          >
            Documentation
          </Button>
        </PageActions>
      </PageHeader>
      <div
        id="charts"
        class="border-grid sticky top-(--header-height) z-40 bg-background/95 backdrop-blur"
      >
        <ChartsNav />
      </div>
      <div class="container-wrapper flex-1">
        <div class="container px-4 py-8 sm:px-6 lg:py-12">
          <Outlet />
        </div>
      </div>
    </>
  );
}
