import { createFileRoute, redirect } from "@tanstack/solid-router";

export const Route = createFileRoute("/_public/charts/")({
  beforeLoad: () => {
    throw redirect({
      to: "/charts/$type",
      params: { type: "area" },
      replace: true,
    });
  },
});
