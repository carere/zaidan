import { createHash } from "node:crypto";
import type { RegistryItem } from "shadcn/schema";
import { FONT_DEFINITIONS } from "@/lib/fonts";
import { decodePresetToken } from "@/lib/preset-token";
import { buildRegistryTheme } from "@/lib/theme-utils";

const REGISTRY_ORIGIN = "https://zaidan.carere.dev";

export function projectPresetRegistryItem(token: string): RegistryItem | null {
  const config = decodePresetToken(token);
  if (!config) return null;
  const theme = buildRegistryTheme(config);
  const bodyFont = FONT_DEFINITIONS.find(({ name }) => name === config.font);
  const headingFont = FONT_DEFINITIONS.find(({ name }) => name === config.headingFont);
  if (!theme || !bodyFont || !headingFont) return null;

  const withFontRoles = (values: Record<string, string>) => ({
    ...values,
    "font-sans": bodyFont.family,
    "font-heading": headingFont.family,
  });

  return {
    name: `preset-${token}`,
    title: `Zaidan Preset ${token}`,
    description: "Generated immutable Zaidan Design Configuration.",
    type: "registry:theme",
    dependencies: [...new Set([bodyFont.dependency, headingFont.dependency])],
    registryDependencies: [`${REGISTRY_ORIGIN}/r/kobalte/style-${config.style}.json`],
    cssVars: {
      light: withFontRoles(theme.cssVars.light),
      dark: withFontRoles(theme.cssVars.dark),
    },
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
