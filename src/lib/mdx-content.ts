import { lazy } from "solid-js";
import type { MdxModule } from "@/lib/types";

type MdxLoader = () => Promise<MdxModule>;

function createMdxContent(loader: MdxLoader) {
  return lazy(loader);
}

export type MdxContent = ReturnType<typeof createMdxContent>;

const modules = import.meta.glob<MdxModule>("../pages/**/*.mdx");
const content = new Map<string, MdxContent>();

for (const [path, loader] of Object.entries(modules)) {
  content.set(path, createMdxContent(loader));
}

export function getMdxContent(path: string) {
  const component = content.get(path);
  if (!component) {
    throw new Error(`MDX content was not found for ${path}`);
  }
  return component;
}

export async function preloadMdxContent(path: string) {
  await getMdxContent(path).preload();
}
