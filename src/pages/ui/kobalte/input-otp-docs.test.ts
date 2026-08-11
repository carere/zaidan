import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./input-otp.mdx", import.meta.url));
const demoNames = [
  "input-otp-demo",
  "input-otp-pattern",
  "input-otp-alphanumeric",
  "input-otp-separator",
  "input-otp-disabled",
  "input-otp-controlled",
  "input-otp-invalid",
  "input-otp-four-digits",
  "input-otp-form",
];

describe("Input OTP documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');
    }

    for (const name of demoNames) {
      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).toContain("## Pattern");
    expect(page).toContain("## Alphanumeric");
  });
});
