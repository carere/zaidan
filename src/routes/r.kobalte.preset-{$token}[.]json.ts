import { createFileRoute } from "@tanstack/solid-router";
import { createPresetRegistryResponse } from "@/lib/preset-registry";

export const Route = createFileRoute("/r/kobalte/preset-{$token}.json")({
  server: {
    handlers: {
      GET: ({ params }: { params: { token: string } }) =>
        createPresetRegistryResponse(params.token),
    },
  },
});
