import { createHash } from "node:crypto";
import { registryItemSchema } from "shadcn/schema";
import { describe, expect, it } from "vitest";
import { createPresetRegistryResponse, projectPresetRegistryItem } from "@/lib/preset-registry";
import { projectPresetTheme } from "@/lib/preset-theme";
import { SEMANTIC_PRESET_CONFIG, SEMANTIC_PRESET_TOKEN } from "@/lib/preset-token";
import { buildRegistryTheme } from "@/lib/theme-utils";
import registry from "@/registry/kobalte/registry.json";

describe("virtual Preset Token registry projection", () => {
  const config = SEMANTIC_PRESET_CONFIG;
  const token = SEMANTIC_PRESET_TOKEN;

  it("produces a schema-valid deterministic theme with exact style, font roles, and variables", () => {
    const first = projectPresetRegistryItem(token);
    const second = projectPresetRegistryItem(token);
    expect(first).toEqual(second);
    expect(registryItemSchema.safeParse(first).success).toBe(true);
    expect(first).toMatchObject({
      name: `preset-${token}`,
      type: "registry:theme",
      dependencies: ["@fontsource-variable/geist", "@fontsource-variable/oxanium"],
      registryDependencies: ["https://zaidan.carere.dev/r/kobalte/style-nova.json"],
      cssVars: {
        light: {
          radius: "0.75rem",
          "font-sans": "'Geist Variable', sans-serif",
          "font-heading": "'Oxanium Variable', sans-serif",
        },
        dark: {
          radius: "0.75rem",
          "font-sans": "'Geist Variable', sans-serif",
          "font-heading": "'Oxanium Variable', sans-serif",
        },
      },
    });
    expect(first?.cssVars?.light?.["chart-1"]).toBeDefined();
    expect(first?.cssVars?.light?.["sidebar-accent"]).toBe(first?.cssVars?.light?.primary);
    expect(first?.files).toBeUndefined();
  });

  it("exactly preserves canonical light/dark variables and adds only the two font roles", () => {
    const canonical = buildRegistryTheme(config);
    const projection = projectPresetTheme(config);
    expect(canonical).not.toBeNull();
    expect(projection).not.toBeNull();
    if (!canonical || !projection) return;

    const expected = {
      light: {
        ...canonical.cssVars.light,
        "font-sans": "'Geist Variable', sans-serif",
        "font-heading": "'Oxanium Variable', sans-serif",
      },
      dark: {
        ...canonical.cssVars.dark,
        "font-sans": "'Geist Variable', sans-serif",
        "font-heading": "'Oxanium Variable', sans-serif",
      },
    };
    expect(projection.cssVars).toEqual(expected);
    expect(projectPresetRegistryItem(token)?.cssVars).toEqual(expected);
  });

  it("returns immutable cache metadata and stable ETag for valid tokens", async () => {
    const first = createPresetRegistryResponse(token);
    const second = createPresetRegistryResponse(token);
    const body = await first.clone().text();
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(first.headers.get("etag")).toBe(
      `"${createHash("sha256").update(body).digest("base64url")}"`,
    );
    expect(second.headers.get("etag")).toBe(first.headers.get("etag"));
    expect(await second.text()).toBe(body);
  });

  it("returns 404 for invalid tokens", async () => {
    const response = createPresetRegistryResponse("v2-0");
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not add virtual presets to the authored Component Catalog registry", () => {
    expect(registry.items.some(({ name }) => name.startsWith("preset-"))).toBe(false);
  });
});
