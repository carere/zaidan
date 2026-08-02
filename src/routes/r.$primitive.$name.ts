import { createFileRoute } from "@tanstack/solid-router";
import { buildPresetRegistryItem } from "@/lib/registry-preset";

const PRESET_PREFIX = "preset-";
const JSON_SUFFIX = ".json";

export const Route = createFileRoute("/r/$primitive/$name")({
  server: {
    handlers: {
      GET: ({ params }) => {
        if (
          params.primitive !== "kobalte" ||
          !params.name.startsWith(PRESET_PREFIX) ||
          !params.name.endsWith(JSON_SUFFIX)
        ) {
          return Response.json({ error: "Registry item not found" }, { status: 404 });
        }

        const code = params.name.slice(PRESET_PREFIX.length, -JSON_SUFFIX.length);
        const item = buildPresetRegistryItem(code);
        if (!item) {
          return Response.json({ error: "Invalid preset" }, { status: 400 });
        }

        return Response.json(item, {
          headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        });
      },
    },
  },
});
