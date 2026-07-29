import { describe, expect, it } from "vitest";
import {
  CANONICAL_BLOCK_SLUGS,
  CANONICAL_CHANGELOG_SLUGS,
  CANONICAL_COMPONENT_SLUGS,
  CANONICAL_CONTENT_TREE,
  getCanonicalTraversal,
  getProductSurfaceForPath,
  LEGACY_REDIRECTS,
  PRODUCT_SURFACES,
  resolveCompatibilityRedirect,
  resolvePreviewRequest,
  validateCanonicalRoutingModel,
} from "@/lib/product-routing";

const componentOrder = [
  "accordion",
  "alert",
  "alert-dialog",
  "aspect-ratio",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "button-group",
  "calendar",
  "card",
  "carousel",
  "chart",
  "checkbox",
  "collapsible",
  "combobox",
  "command",
  "context-menu",
  "dialog",
  "drawer",
  "dropdown-menu",
  "empty",
  "field",
  "hover-card",
  "input",
  "input-group",
  "input-otp",
  "item",
  "kbd",
  "label",
  "menubar",
  "native-select",
  "navigation-menu",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "resizable",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "slider",
  "sonner",
  "spinner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toggle",
  "toggle-group",
  "tooltip",
];

describe("canonical Product Surface routing", () => {
  it("owns the exact five Product Surfaces in canonical order", () => {
    expect(PRODUCT_SURFACES).toEqual([
      { id: "home", label: "Home", path: "/" },
      { id: "docs", label: "Docs", path: "/docs" },
      { id: "components", label: "Components", path: "/components" },
      { id: "charts", label: "Charts", path: "/charts" },
      { id: "create", label: "Create", path: "/create" },
    ]);

    expect(getProductSurfaceForPath("/")?.id).toBe("home");
    expect(getProductSurfaceForPath("/docs/installation/vite")?.id).toBe("docs");
    expect(getProductSurfaceForPath("/components/blocks/sortable")?.id).toBe("components");
    expect(getProductSurfaceForPath("/charts/area")?.id).toBe("charts");
    expect(getProductSurfaceForPath("/create")?.id).toBe("create");
    expect(getProductSurfaceForPath("/preview/components/button")).toBeUndefined();
  });

  it("defines exact Docs, catalog, Changelog, anchor, and traversal order", () => {
    const docs = CANONICAL_CONTENT_TREE.find(({ surface }) => surface === "docs");
    expect(docs?.children.map(({ path }) => path)).toEqual([
      "/docs",
      "/docs/installation",
      "/docs/customization",
      "/docs/dark-mode",
      "/docs/zaidan-agent",
      "/docs/faq",
      "/docs/roadmap",
      "/docs/changelog",
    ]);
    expect(docs?.children[1]?.children?.map(({ path }) => path)).toEqual([
      "/docs/installation/vite",
      "/docs/installation/astro",
      "/docs/installation/tanstack-start",
      "/docs/installation/tanstack-router",
      "/docs/installation/solid-start",
      "/docs/installation/manual",
    ]);
    expect(CANONICAL_COMPONENT_SLUGS).toEqual(componentOrder);
    expect(CANONICAL_BLOCK_SLUGS).toEqual(["image-crop", "sortable"]);
    expect(CANONICAL_CHANGELOG_SLUGS).toEqual([
      "image-crop-and-agent-docs",
      "sortable-and-design-refresh",
      "zaidan-agent",
      "launch",
    ]);

    const sidebar = CANONICAL_CONTENT_TREE.flatMap(({ children }) => children).find(
      ({ path }) => path === "/components/sidebar",
    );
    expect(sidebar?.anchors).toEqual(
      expect.arrayContaining(["sidebar-floating", "sidebar-icon", "sidebar-inset"]),
    );

    expect(getCanonicalTraversal("/docs/installation/vite")).toEqual({
      previous: { label: "Installation", path: "/docs/installation" },
      next: { label: "Astro", path: "/docs/installation/astro" },
    });
    expect(getCanonicalTraversal("/components/sidebar")?.next).toEqual({
      label: "Skeleton",
      path: "/components/skeleton",
    });
  });

  it("resolves every allowlisted compatibility route to a one-hop canonical target", () => {
    expect(resolveCompatibilityRedirect("/installation/astro?source=legacy#typescript")).toBe(
      "/docs/installation/astro?source=legacy#typescript",
    );
    expect(resolveCompatibilityRedirect("/ui/button/docs?source=legacy#examples")).toBe(
      "/components/button?source=legacy#examples",
    );
    expect(resolveCompatibilityRedirect("/ui/sidebar-inset")).toBe(
      "/components/sidebar#sidebar-inset",
    );
    expect(resolveCompatibilityRedirect("/ui/sidebar-inset#props")).toBe(
      "/components/sidebar#props",
    );
    expect(resolveCompatibilityRedirect("/blocks/sortable/docs?style=nova&keep=1")).toBe(
      "/components/blocks/sortable?keep=1",
    );
    expect(resolveCompatibilityRedirect("/preview/ui/kobalte/button?style=nova#examples")).toBe(
      "/preview/components/button#examples",
    );
    expect(resolveCompatibilityRedirect("/preview/blocks/kobalte/sortable?radius=large")).toBe(
      "/preview/blocks/sortable",
    );
    expect(resolveCompatibilityRedirect("/preview/home?style=nova#anything")).toBe("/");
    expect(resolveCompatibilityRedirect("/not-allowlisted")).toBeUndefined();

    const sources = new Set(LEGACY_REDIRECTS.map(({ source }) => source));
    expect(sources.size).toBe(LEGACY_REDIRECTS.length);
    for (const { destination } of LEGACY_REDIRECTS) {
      expect(resolveCompatibilityRedirect(destination)).toBeUndefined();
    }
  });

  it("accepts only the canonical Preview configuration and fragment boundaries", () => {
    expect(resolvePreviewRequest("/preview/components/button#variants--sizes")).toMatchObject({
      accepted: true,
      kind: "components",
      slug: "button",
      fragment: "variants--sizes",
    });
    expect(resolvePreviewRequest("/preview/blocks/image-crop#avatar-crop")).toMatchObject({
      accepted: true,
      kind: "blocks",
      slug: "image-crop",
      fragment: "avatar-crop",
    });
    expect(resolvePreviewRequest("/preview/create")).toEqual({
      accepted: true,
      kind: "create",
      canonicalPath: "/create",
    });
    expect(resolvePreviewRequest("/preview/create?preset=v1-A")).toEqual({
      accepted: true,
      kind: "create",
      canonicalPath: "/create",
      preset: "v1-A",
    });

    for (const rejected of [
      "/preview/components/button?style=nova",
      "/preview/components/button?preset=v1-A",
      "/preview/components/button#not-a-stable-example",
      "/preview/components/button#%E0%A4%A",
      "/preview/components/sidebar-floating",
      "/preview/blocks/unknown",
      "/preview/charts/unknown",
      "/preview/create?preset=v1-0",
      "/preview/create?preset=not-a-token",
      "/preview/create?style=nova",
      "/preview/ui/kobalte/button",
    ]) {
      expect(resolvePreviewRequest(rejected), rejected).toEqual({ accepted: false });
    }
  });

  it("rejects invalid build-time routing models", () => {
    expect(validateCanonicalRoutingModel()).toEqual([]);

    const canonical = CANONICAL_CONTENT_TREE[1]?.children[0];
    if (!canonical) throw new Error("Expected the canonical Docs root fixture");

    expect(
      validateCanonicalRoutingModel({
        additionalNodes: [{ ...canonical, id: "duplicate-target" }],
      }),
    ).toContainEqual(expect.stringContaining("duplicate canonical target"));
    expect(
      validateCanonicalRoutingModel({
        additionalNodes: [{ ...canonical, path: "/docs/missing", id: canonical.id }],
      }),
    ).toContainEqual(expect.stringContaining("duplicate canonical identity"));
    expect(validateCanonicalRoutingModel({ availableRoutePatterns: ["/"] })).toContainEqual(
      expect.stringContaining("missing route"),
    );
    expect(
      validateCanonicalRoutingModel({
        additionalNodes: [
          { ...canonical, id: "unknown-surface", path: "/docs/unknown", surface: "unknown" },
        ],
      }),
    ).toContainEqual(expect.stringContaining("unknown Product Surface"));
    expect(
      validateCanonicalRoutingModel({
        additionalNodes: [
          { ...canonical, id: "retired-url", path: "/ui/retired", surface: "components" },
        ],
      }),
    ).toContainEqual(expect.stringContaining("retired URL"));
    expect(
      validateCanonicalRoutingModel({
        additionalRedirects: [
          { source: "/old", destination: "/components/sidebar#missing-anchor" },
        ],
      }),
    ).toContainEqual(expect.stringContaining("invalid fragment"));
  });
});
