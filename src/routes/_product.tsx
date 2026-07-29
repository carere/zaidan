import { createFileRoute, Outlet } from "@tanstack/solid-router";

export const Route = createFileRoute("/_product")({
  component: () => <Outlet />,
});
