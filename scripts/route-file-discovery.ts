const FILE_ROUTE_LITERAL = /createFileRoute\("([^"]+)"\)/g;

export function routePatternFromId(routeId: string) {
  const segments = routeId
    .split("/")
    .filter((segment) => segment && !segment.startsWith("_"))
    .map((segment) => segment.replace(/_$/, ""));
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

export function extractRoutePatterns(source: string) {
  return Array.from(source.matchAll(FILE_ROUTE_LITERAL), (match) =>
    routePatternFromId(match[1] as string),
  );
}

export async function discoverRoutePatterns(routesDirectory = "src/routes") {
  const patterns: string[] = [];
  const glob = new Bun.Glob("**/*.tsx");

  for await (const path of glob.scan(routesDirectory)) {
    const source = await Bun.file(`${routesDirectory}/${path}`).text();
    patterns.push(...extractRoutePatterns(source));
  }

  return patterns;
}
