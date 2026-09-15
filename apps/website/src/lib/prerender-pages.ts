import { readdirSync } from "node:fs";
import { extname, join } from "node:path";

const projectRoot = join(import.meta.dirname, "../..");

function getSlugs(directory: string, extension: string) {
  return readdirSync(join(projectRoot, directory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name) === extension)
    .map((entry) => entry.name.slice(0, -extension.length))
    .sort();
}

function getChartTypes() {
  const types = getSlugs("src/registry/kobalte/charts", ".tsx")
    .map((slug) => slug.match(/^chart-([^-]+)-/)?.[1])
    .filter((type): type is string => type !== undefined);

  return [...new Set(types)].sort();
}

export function getPrerenderPages() {
  const docs = getSlugs("src/pages/docs", ".mdx");
  const installation = getSlugs("src/pages/docs/installation", ".mdx");
  const components = getSlugs("src/pages/ui/kobalte", ".mdx");
  const changelog = getSlugs("src/pages/changelog", ".mdx");
  const chartTypes = getChartTypes();

  const paths = [
    "/",
    "/docs",
    "/docs/components",
    "/docs/changelog",
    ...docs
      .filter((slug) => slug !== "index" && slug !== "components")
      .map((slug) => `/docs/${slug}`),
    ...installation.map((slug) => `/docs/installation/${slug}`),
    ...components.map((slug) => `/docs/components/kobalte/${slug}`),
    ...changelog.map((slug) => `/docs/changelog/${slug}`),
    ...chartTypes.map((type) => `/charts/${type}`),
  ];

  return paths.map((path) => ({ path }));
}
