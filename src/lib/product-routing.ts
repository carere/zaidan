import { blocks, changelog, docs, ui } from "@velite";
import { getChartCatalogEntry } from "@/lib/chart-catalog";
import { DEFAULT_PRESET_TOKEN, decodePresetToken } from "@/lib/preset-token";

export type ProductSurfaceId = "home" | "docs" | "components" | "charts" | "create";

export const PRODUCT_SURFACES = [
  { id: "home", label: "Home", path: "/" },
  { id: "docs", label: "Docs", path: "/docs" },
  { id: "components", label: "Components", path: "/components" },
  { id: "charts", label: "Charts", path: "/charts" },
  { id: "create", label: "Create", path: "/create" },
] as const satisfies readonly {
  id: ProductSurfaceId;
  label: string;
  path: string;
}[];

export type CanonicalNode = {
  id: string;
  label: string;
  path: string;
  surface: ProductSurfaceId;
  description?: string;
  anchors?: readonly string[];
  previewAnchors?: readonly string[];
  children?: readonly CanonicalNode[];
};

export type TocNode = {
  title: string;
  url: string;
  items: readonly TocNode[];
};

export const getReadingToc = (toc: readonly TocNode[]): TocNode[] =>
  toc.map((item) => ({
    ...item,
    items: item.items.map((child) => ({ ...child, items: [] })),
  }));

const anchorsFromToc = (toc: readonly TocNode[]): string[] =>
  toc.flatMap((item) => [item.url.replace(/^#/, ""), ...anchorsFromToc(item.items)]);

const previewAnchorsFromToc = (toc: readonly TocNode[]): string[] =>
  toc.flatMap((item) => [
    ...(item.title === "Examples" ? anchorsFromToc(item.items) : []),
    ...previewAnchorsFromToc(item.items),
  ]);

const authoredNode = (
  entry: { slug: string; title: string; description: string; toc: readonly TocNode[] },
  surface: ProductSurfaceId,
  path: string,
  kind: string,
): CanonicalNode => ({
  id: `${kind}:${entry.slug}`,
  label: entry.title,
  description: entry.description,
  path,
  surface,
  anchors: anchorsFromToc(entry.toc),
  previewAnchors: previewAnchorsFromToc(entry.toc),
});

const docsBySlug = new Map(docs.map((entry) => [entry.slug, entry]));

const requireDoc = (slug: string) => {
  const entry = docsBySlug.get(slug);
  if (!entry) throw new TypeError(`Canonical Docs entry "${slug}" has no authored source`);
  return entry;
};

const INSTALLATION_SLUGS = [
  "vite",
  "astro",
  "tanstack-start",
  "tanstack-router",
  "solid-start",
  "manual",
] as const;

const SIDEBAR_VARIANT_SLUGS = ["sidebar-floating", "sidebar-icon", "sidebar-inset"] as const;
const sidebarVariants = ui.filter((entry) =>
  SIDEBAR_VARIANT_SLUGS.includes(entry.slug as (typeof SIDEBAR_VARIANT_SLUGS)[number]),
);

const sortedComponents = ui
  .filter(
    (entry) =>
      !SIDEBAR_VARIANT_SLUGS.includes(entry.slug as (typeof SIDEBAR_VARIANT_SLUGS)[number]),
  )
  .toSorted((left, right) => left.title.localeCompare(right.title));
const sortedBlocks = blocks.toSorted((left, right) => left.title.localeCompare(right.title));
const sortedChangelog = changelog.toSorted(
  (left, right) => right.date.localeCompare(left.date) || left.slug.localeCompare(right.slug),
);

export const CANONICAL_COMPONENT_SLUGS = sortedComponents.map(({ slug }) => slug);
export const CANONICAL_BLOCK_SLUGS = sortedBlocks.map(({ slug }) => slug);
export const CANONICAL_CHANGELOG_SLUGS = sortedChangelog.map(({ slug }) => slug);

const componentNodes = sortedComponents.map((entry) => {
  const node = authoredNode(entry, "components", `/components/${entry.slug}`, "component");

  if (entry.slug !== "sidebar") return node;

  const variantAnchors = sidebarVariants.flatMap((variant) => anchorsFromToc(variant.toc));
  return {
    ...node,
    anchors: [...new Set([...(node.anchors ?? []), ...SIDEBAR_VARIANT_SLUGS, ...variantAnchors])],
    previewAnchors: node.previewAnchors,
  };
});

const blockNodes = sortedBlocks.map((entry) =>
  authoredNode(entry, "components", `/components/blocks/${entry.slug}`, "block"),
);

type CanonicalDocsDescriptor = {
  entry: { slug: string; title: string; description: string; toc: readonly TocNode[] };
  path: string;
  source: string;
  kind: "docs" | "changelog";
  date?: string;
};

const describeDoc = (slug: string, path: string, source = `docs/${slug}`) => ({
  entry: requireDoc(slug),
  path,
  source,
  kind: "docs" as const,
});

const introductionDescriptor = describeDoc("introduction", "/docs");
const installationDescriptor = describeDoc("installation", "/docs/installation");
const installationDescriptors = INSTALLATION_SLUGS.map((slug) => {
  const entry = docs.find(
    (candidate) => candidate.parent === "installation" && candidate.slug === slug,
  );
  if (!entry) throw new TypeError(`Canonical installation entry "${slug}" has no authored source`);
  return {
    entry,
    path: `/docs/installation/${slug}`,
    source: `docs/installation/${slug}`,
    kind: "docs" as const,
  };
});
const guideDescriptors = ["customization", "dark-mode", "zaidan-agent", "faq", "roadmap"].map(
  (slug) => describeDoc(slug, `/docs/${slug}`),
);
const changelogOverviewDescriptor = describeDoc("changelog", "/docs/changelog");
const changelogDescriptors = sortedChangelog.map((entry) => ({
  entry,
  path: `/docs/changelog/${entry.slug}`,
  source: `changelog/${entry.slug}`,
  kind: "changelog" as const,
  date: entry.date,
}));
const canonicalDocsDescriptors: readonly CanonicalDocsDescriptor[] = [
  introductionDescriptor,
  installationDescriptor,
  ...installationDescriptors,
  ...guideDescriptors,
  changelogOverviewDescriptor,
  ...changelogDescriptors,
];

const descriptorNode = (descriptor: CanonicalDocsDescriptor) =>
  authoredNode(descriptor.entry, "docs", descriptor.path, descriptor.kind);

const introductionNode = descriptorNode(introductionDescriptor);
const installationChildren = installationDescriptors.map(descriptorNode);
const installationNode: CanonicalNode = {
  ...descriptorNode(installationDescriptor),
  children: installationChildren,
};
const guideNodes = guideDescriptors.map(descriptorNode);
const changelogChildren = changelogDescriptors.map(descriptorNode);
const changelogNode: CanonicalNode = {
  ...descriptorNode(changelogOverviewDescriptor),
  children: changelogChildren,
};
const docsOverviewNodes: readonly CanonicalNode[] = [
  installationNode,
  ...guideNodes,
  changelogNode,
];

const docsNodes: readonly CanonicalNode[] = [introductionNode, ...docsOverviewNodes];

export type CanonicalNavigationGroup = {
  id: "getting-started" | "installation" | "guides" | "changelog";
  label: string;
  nodes: readonly CanonicalNode[];
};

export const DOCS_NAVIGATION_GROUPS: readonly CanonicalNavigationGroup[] = [
  { id: "getting-started", label: "Getting Started", nodes: [introductionNode] },
  { id: "installation", label: "Installation", nodes: [installationNode] },
  { id: "guides", label: "Guides", nodes: guideNodes },
  { id: "changelog", label: "Changelog", nodes: [changelogNode] },
];

export type CanonicalSurfaceTree = {
  surface: ProductSurfaceId;
  children: readonly CanonicalNode[];
};

export const CANONICAL_CONTENT_TREE: readonly CanonicalSurfaceTree[] = [
  {
    surface: "home",
    children: [
      {
        id: "surface:home",
        label: "Home",
        path: "/",
        surface: "home",
        anchors: [],
      },
    ],
  },
  { surface: "docs", children: docsNodes },
  {
    surface: "components",
    children: [
      {
        id: "surface:components",
        label: "Components",
        path: "/components",
        surface: "components",
        anchors: [],
      },
      ...componentNodes,
      {
        id: "components:blocks",
        label: "Blocks",
        path: "/components/blocks",
        surface: "components",
        anchors: [],
        children: blockNodes,
      },
    ],
  },
  {
    surface: "charts",
    children: [
      {
        id: "surface:charts",
        label: "Charts",
        path: "/charts",
        surface: "charts",
        anchors: [],
      },
      {
        id: "charts:radar",
        label: "Radar Charts",
        path: "/charts/radar",
        surface: "charts",
        anchors: [],
      },
      {
        id: "charts:tooltip",
        label: "Tooltip Charts",
        path: "/charts/tooltip",
        surface: "charts",
        anchors: [],
      },
    ],
  },
  {
    surface: "create",
    children: [
      {
        id: "surface:create",
        label: "Create",
        path: "/create",
        surface: "create",
        anchors: [],
      },
    ],
  },
];

const flattenNodes = (nodes: readonly CanonicalNode[]): CanonicalNode[] =>
  nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])]);

export const CANONICAL_NODES = CANONICAL_CONTENT_TREE.flatMap(({ children }) =>
  flattenNodes(children),
);
export const CANONICAL_ROUTE_PATHS = CANONICAL_NODES.map(({ path }) => path);

export type CanonicalReadingEntry = {
  source: string;
  toc: readonly TocNode[];
  date?: string;
};

const readingEntryByPath = new Map<string, CanonicalReadingEntry>(
  canonicalDocsDescriptors.map((descriptor): [string, CanonicalReadingEntry] => [
    descriptor.path,
    {
      source: descriptor.source,
      toc: descriptor.entry.toc,
      ...(descriptor.date ? { date: descriptor.date } : {}),
    },
  ]),
);

const nodeByPath = new Map(CANONICAL_NODES.map((node) => [node.path, node]));

export function getCanonicalNode(path: string) {
  return nodeByPath.get(path);
}

export function requireCanonicalNode(path: string) {
  const node = getCanonicalNode(path);
  if (!node) throw new TypeError(`Canonical route "${path}" is missing`);
  return node;
}

export function getCanonicalReadingEntry(path: string) {
  return readingEntryByPath.get(path);
}

export function requireCanonicalReadingEntry(path: string) {
  const entry = getCanonicalReadingEntry(path);
  if (!entry) throw new TypeError(`Canonical route "${path}" has no authored source`);
  return entry;
}

export function getProductSurfaceForPath(pathname: string) {
  return PRODUCT_SURFACES.find(({ path }) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`),
  );
}

const traversalBySurface = new Map(
  CANONICAL_CONTENT_TREE.map(({ surface, children }) => [surface, flattenNodes(children)]),
);

export function getCanonicalTraversal(path: string) {
  const node = nodeByPath.get(path);
  if (!node) return undefined;
  const traversal = traversalBySurface.get(node.surface) ?? [];
  const index = traversal.findIndex((candidate) => candidate.path === path);
  const previous = traversal[index - 1];
  const next = traversal[index + 1];

  return {
    previous: previous ? { label: previous.label, path: previous.path } : undefined,
    next: next ? { label: next.label, path: next.path } : undefined,
  };
}

export function getCanonicalOverviewChildren(path: string) {
  if (path === introductionNode.path) return docsOverviewNodes;
  const node = nodeByPath.get(path);
  return node?.children?.length ? node.children : undefined;
}

type RedirectQueryPolicy = "preserve" | "strip-design-configuration" | "drop";

export const LEGACY_ANCHOR_QUERY_KEY = "_zaidan_legacy_anchor";

export type CompatibilityRedirect = {
  source: string;
  destination: string;
  queryPolicy?: RedirectQueryPolicy;
  dropFragment?: boolean;
};

const legacyContentRedirects: CompatibilityRedirect[] = [
  {
    source: "/preview/home",
    destination: "/",
    queryPolicy: "strip-design-configuration",
  },
  ...["customization", "dark-mode", "faq", "installation", "roadmap", "zaidan-agent"].map(
    (slug) => ({
      source: `/${slug}`,
      destination: `/docs/${slug}`,
      queryPolicy: "strip-design-configuration" as const,
    }),
  ),
  ...INSTALLATION_SLUGS.map((slug) => ({
    source: `/installation/${slug}`,
    destination: `/docs/installation/${slug}`,
    queryPolicy: "strip-design-configuration" as const,
  })),
  {
    source: "/changelog",
    destination: "/docs/changelog",
    queryPolicy: "strip-design-configuration",
  },
  ...CANONICAL_CHANGELOG_SLUGS.map((slug) => ({
    source: `/changelog/${slug}`,
    destination: `/docs/changelog/${slug}`,
    queryPolicy: "strip-design-configuration" as const,
  })),
  { source: "/ui", destination: "/components", queryPolicy: "strip-design-configuration" },
  ...ui.flatMap((entry): CompatibilityRedirect[] => {
    const variant = SIDEBAR_VARIANT_SLUGS.includes(
      entry.slug as (typeof SIDEBAR_VARIANT_SLUGS)[number],
    );
    const destination = variant ? `/components/sidebar#${entry.slug}` : `/components/${entry.slug}`;
    return [
      { source: `/ui/${entry.slug}`, destination, queryPolicy: "strip-design-configuration" },
      {
        source: `/ui/${entry.slug}/docs`,
        destination,
        queryPolicy: "strip-design-configuration",
      },
    ];
  }),
  {
    source: "/blocks",
    destination: "/components/blocks",
    queryPolicy: "strip-design-configuration",
  },
  ...blocks.flatMap((entry): CompatibilityRedirect[] => [
    {
      source: `/blocks/${entry.slug}`,
      destination: `/components/blocks/${entry.slug}`,
      queryPolicy: "strip-design-configuration",
    },
    {
      source: `/blocks/${entry.slug}/docs`,
      destination: `/components/blocks/${entry.slug}`,
      queryPolicy: "strip-design-configuration",
    },
  ]),
];

export const LEGACY_REDIRECTS: readonly CompatibilityRedirect[] = legacyContentRedirects;

const redirectBySource = new Map(LEGACY_REDIRECTS.map((entry) => [entry.source, entry]));
const LEGACY_DESIGN_CONFIGURATION_KEYS = new Set([
  "primitive",
  "style",
  "baseColor",
  "theme",
  "chartColor",
  "font",
  "headingFont",
  "radius",
  "menuAccent",
]);

const decodedQueryKey = (part: string) => {
  const rawKey = part.split("=", 1)[0] ?? "";
  try {
    return decodeURIComponent(rawKey.replaceAll("+", " "));
  } catch {
    return rawKey;
  }
};

const stripLegacyDesignConfiguration = (search: string) => {
  if (!search) return "";
  const kept = search
    .replace(/^\?/, "")
    .split("&")
    .filter((part) => !LEGACY_DESIGN_CONFIGURATION_KEYS.has(decodedQueryKey(part)));
  return kept.length > 0 ? `?${kept.join("&")}` : "";
};

export function resolveCompatibilityRedirect(input: string) {
  const url = new URL(input, "https://zaidan.invalid");
  const rule = redirectBySource.get(url.pathname);
  if (!rule) return undefined;

  const destination = new URL(rule.destination, "https://zaidan.invalid");
  if (rule.queryPolicy === "drop") destination.search = "";
  else if (rule.queryPolicy === "strip-design-configuration") {
    destination.search = stripLegacyDesignConfiguration(url.search);
  } else destination.search = url.search;

  if (rule.dropFragment) destination.hash = "";
  else if (url.hash) destination.hash = url.hash;

  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export type PreviewResolution =
  | { accepted: false }
  | {
      accepted: true;
      kind: "components" | "blocks" | "charts" | "create";
      canonicalPath: string;
      slug?: string;
      fragment?: string;
      preset?: string;
    };

export function resolvePreviewRequest(input: string): PreviewResolution {
  const url = new URL(input, "https://zaidan.invalid");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "preview") return { accepted: false };

  if (parts.length === 2 && parts[1] === "create") {
    if (url.hash) return { accepted: false };
    const keys = [...url.searchParams.keys()];
    if (keys.some((key) => key !== "preset") || url.searchParams.getAll("preset").length > 1) {
      return { accepted: false };
    }
    const hasPreset = url.searchParams.has("preset");
    const preset = url.searchParams.get("preset") ?? undefined;
    if (hasPreset && (!preset || !decodePresetToken(preset) || preset === DEFAULT_PRESET_TOKEN)) {
      return { accepted: false };
    }
    return {
      accepted: true,
      kind: "create",
      canonicalPath: "/create",
      ...(preset ? { preset } : {}),
    };
  }

  if (parts.length !== 3 || url.search) return { accepted: false };
  const kind = parts[1];
  const slug = parts[2];
  if (!kind || !slug || !["components", "blocks", "charts"].includes(kind)) {
    return { accepted: false };
  }

  const node =
    kind === "components"
      ? nodeByPath.get(`/components/${slug}`)
      : kind === "blocks"
        ? nodeByPath.get(`/components/blocks/${slug}`)
        : nodeByPath.get("/charts");
  const chartEntry = kind === "charts" ? getChartCatalogEntry(slug) : undefined;
  if (!node || (kind === "charts" && !chartEntry)) return { accepted: false };

  let fragment: string | undefined;
  if (url.hash) {
    try {
      fragment = decodeURIComponent(url.hash.slice(1));
    } catch {
      return { accepted: false };
    }
  }
  if (fragment && (kind === "charts" || !node.previewAnchors?.includes(fragment))) {
    return { accepted: false };
  }

  return {
    accepted: true,
    kind: kind as "components" | "blocks" | "charts",
    slug,
    canonicalPath: kind === "charts" ? (chartEntry?.canonicalPath ?? node.path) : node.path,
    ...(fragment ? { fragment } : {}),
  };
}

type ValidationNode = Omit<CanonicalNode, "surface" | "children"> & {
  surface: string;
  children?: readonly ValidationNode[];
};

type ValidationOptions = {
  additionalNodes?: readonly ValidationNode[];
  additionalRedirects?: readonly CompatibilityRedirect[];
  availableRoutePatterns?: readonly string[];
};

const routePatternMatches = (pattern: string, path: string) => {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  return (
    patternParts.length === pathParts.length &&
    patternParts.every(
      (part, index) =>
        part.startsWith(":") ||
        part.startsWith("$") ||
        part.startsWith("{-$") ||
        part === pathParts[index],
    )
  );
};

const isRetiredCanonicalPath = (path: string) =>
  ["/ui", "/blocks", "/installation", "/changelog", "/preview"].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

export function validateCanonicalRoutingModel(options: ValidationOptions = {}) {
  const errors: string[] = [];
  const nodes: ValidationNode[] = [
    ...CANONICAL_NODES,
    ...(options.additionalNodes ? flattenNodes(options.additionalNodes as CanonicalNode[]) : []),
  ];
  const redirects = [...LEGACY_REDIRECTS, ...(options.additionalRedirects ?? [])];
  const patterns = options.availableRoutePatterns;
  const surfaceIds = new Set(PRODUCT_SURFACES.map(({ id }) => id));
  const identities = new Set<string>();
  const targets = new Set<string>();

  for (const node of nodes) {
    if (identities.has(node.id)) errors.push(`duplicate canonical identity: ${node.id}`);
    identities.add(node.id);
    if (targets.has(node.path)) errors.push(`duplicate canonical target: ${node.path}`);
    targets.add(node.path);
    if (!surfaceIds.has(node.surface as ProductSurfaceId)) {
      errors.push(`unknown Product Surface: ${node.surface}`);
    }
    if (isRetiredCanonicalPath(node.path))
      errors.push(`retired URL used canonically: ${node.path}`);
    if (patterns && !patterns.some((pattern) => routePatternMatches(pattern, node.path))) {
      errors.push(`missing route for canonical target: ${node.path}`);
    }
  }

  const redirectSources = new Set<string>();
  for (const redirect of redirects) {
    if (redirectSources.has(redirect.source)) {
      errors.push(`duplicate compatibility source: ${redirect.source}`);
    }
    redirectSources.add(redirect.source);

    const destination = new URL(redirect.destination, "https://zaidan.invalid");
    const canonicalNode = nodeByPath.get(destination.pathname);
    const preview = resolvePreviewRequest(redirect.destination);
    if (!canonicalNode && !preview.accepted) {
      errors.push(`missing route for compatibility target: ${redirect.destination}`);
    }
    if (
      destination.hash &&
      canonicalNode &&
      !canonicalNode.anchors?.includes(decodeURIComponent(destination.hash.slice(1)))
    ) {
      errors.push(`invalid fragment in compatibility target: ${redirect.destination}`);
    }
    if (redirectBySource.has(destination.pathname)) {
      errors.push(`compatibility redirect is not one hop: ${redirect.source}`);
    }
  }

  return errors;
}

export function assertCanonicalRoutingModel(options: ValidationOptions = {}) {
  const errors = validateCanonicalRoutingModel(options);
  if (errors.length > 0) {
    throw new TypeError(`Canonical routing validation failed:\n- ${errors.join("\n- ")}`);
  }
}

