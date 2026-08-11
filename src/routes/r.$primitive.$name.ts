import { createFileRoute } from "@tanstack/solid-router";
import { buildPresetRegistryItem } from "@/lib/registry-preset";
import { buildTypesetRegistryItem } from "@/lib/registry-typeset";

const JSON_SUFFIX = ".json";

/**
 * Virtual registry items — the ones whose content is derived from a code
 * instead of living in `public/r`. Static files are served ahead of this route,
 * so real items (`button.json`, `typeset.json`) never reach here.
 */
const BUILDERS = [
  { prefix: "preset-", build: buildPresetRegistryItem },
  { prefix: "typeset-", build: buildTypesetRegistryItem },
];

export const Route = createFileRoute("/r/$primitive/$name")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const builder =
          params.primitive === "kobalte" && params.name.endsWith(JSON_SUFFIX)
            ? BUILDERS.find((candidate) => params.name.startsWith(candidate.prefix))
            : undefined;

        if (!builder) {
          return Response.json({ error: "Registry item not found" }, { status: 404 });
        }

        const code = params.name.slice(builder.prefix.length, -JSON_SUFFIX.length);
        const item = builder.build(code);
        if (!item) {
          return Response.json({ error: "Invalid code" }, { status: 400 });
        }

        return Response.json(item, {
          headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        });
      },
    },
  },
});
