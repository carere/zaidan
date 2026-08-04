import { renderToString } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import { EmptyMedia } from "./empty";

describe("Empty", () => {
  it("exposes the pinned default media variant in rendered markup", () => {
    const markup = renderToString(() => <EmptyMedia>Artwork</EmptyMedia>);

    expect(markup).toContain('data-slot="empty-icon"');
    expect(markup).toContain('data-variant="default"');
    expect(markup).toContain("z-empty-media-default");
  });
});
