import { renderToString } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import { Badge } from "./badge";

describe("Badge", () => {
  it("renders the default pinned Badge contract", () => {
    const markup = renderToString(() => <Badge>New</Badge>);

    expect(markup).toContain('data-slot="badge"');
    expect(markup).toContain('data-variant="default"');
    expect(markup).toContain("z-badge-variant-default");
    expect(markup).toContain(">New</span>");
  });

  it("preserves variants and polymorphic link semantics", () => {
    const markup = renderToString(() => (
      <Badge as="a" href="/releases" variant="destructive">
        Release notes
      </Badge>
    ));

    expect(markup).toContain('data-variant="destructive"');
    expect(markup).toContain("z-badge-variant-destructive");
    expect(markup).toContain('href="/releases"');
    expect(markup).toContain(">Release notes</a>");
  });
});
