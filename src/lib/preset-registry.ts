import { createHash } from "node:crypto";
import type { RegistryItem } from "shadcn/schema";
import { projectPresetTheme } from "@/lib/preset-theme";
import { decodePresetToken } from "@/lib/preset-token";

const REGISTRY_ORIGIN = "https://zaidan.carere.dev";

export function projectPresetRegistryItem(token: string): RegistryItem | null {
  const config = decodePresetToken(token);
  if (!config) return null;
  const theme = projectPresetTheme(config);
  if (!theme) return null;

  return {
    name: `preset-${token}`,
    title: `Zaidan Preset ${token}`,
    description: "Generated immutable Zaidan Design Configuration.",
    type: "registry:theme",
    dependencies: theme.dependencies,
    registryDependencies: [`${REGISTRY_ORIGIN}/r/kobalte/style-${config.style}.json`],
    cssVars: theme.cssVars,
  };
}

export function createPresetRegistryResponse(token: string) {
  const item = projectPresetRegistryItem(token);
  if (!item) {
    return Response.json(
      { error: "Preset not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  const body = JSON.stringify(item);
  const etag = `"${createHash("sha256").update(body).digest("base64url")}"`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}
