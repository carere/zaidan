import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = fileURLToPath(new URL("./image-crop.mdx", import.meta.url));
const demoNames = [
  "image-crop-demo",
  "image-crop-aspect-ratio",
  "image-crop-upload",
  "image-crop-controlled",
  "image-crop-output",
];

describe("Image Crop documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/blocks/image-crop"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');
      expect(demo).not.toContain("className");
    }

    const referencedDemos = [...page.matchAll(/<ComponentPreview name="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(new Set(referencedDemos)).toEqual(new Set(demoNames));

    expect(page).toContain("shadcn@latest add @zaidan/image-crop");
    expect(page).toContain("## API Reference");
    expect(page).toContain("### ImageCropProvider");
    expect(page).toContain("### ImageCropCanvas");
    expect(page).toContain("### useImageCrop");
    expect(page).toContain("### ImageCropResult");
  });
});
