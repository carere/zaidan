import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/_app/getting-started")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div class="text-2xl text-foreground">Getting Started Page</div>;
}
