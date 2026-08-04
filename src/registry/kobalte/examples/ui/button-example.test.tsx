import { renderToString } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import ButtonExample from "./button-example";

describe("Button Create gallery", () => {
  it("renders the pinned gallery sections and compositions", () => {
    const markup = renderToString(() => <ButtonExample />);

    for (const title of [
      "Variants &amp; Sizes",
      "Icon Right",
      "Icon Left",
      "Icon Only",
      "Invalid States",
      "Examples",
    ]) {
      expect(markup).toContain(title);
    }

    expect(markup.match(/data-slot="button"/g)).toHaveLength(124);
    expect(markup.match(/aria-invalid="true"/g)).toHaveLength(24);
    expect(markup.match(/data-icon="inline-start"/g)).toHaveLength(24);
    expect(markup.match(/data-icon="inline-end"/g)).toHaveLength(25);
    expect(markup).toMatch(/<a[^>]*href="#"[^>]*z-button-variant-default/);
  });
});
