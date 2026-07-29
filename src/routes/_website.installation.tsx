import { createFileRoute } from "@tanstack/solid-router";
import { compatibilityRouteOptions } from "@/lib/compatibility-route";

export const Route = createFileRoute("/_website/installation")(compatibilityRouteOptions());
