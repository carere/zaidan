import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/_app/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div class="text-2xl text-foreground">Homepage / Landing Page</div>;
}
