import { createFileRoute } from "@tanstack/solid-router";
import { compatibilityResponse, throwCompatibilityRedirect } from "@/lib/compatibility-route";

export const Route = createFileRoute("/_website/dark-mode")({
  server: { handlers: { GET: ({ request }) => compatibilityResponse(request) } },
  beforeLoad: ({ location }) => throwCompatibilityRedirect(location),
});
