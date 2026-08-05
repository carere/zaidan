import { renderToString } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import { Label } from "./label";

describe("Label", () => {
  it("renders the pinned native label contract", () => {
    const markup = renderToString(() => (
      <Label for="account-email" class="custom-label" aria-label="Email address">
        Email
      </Label>
    ));

    expect(markup).toMatch(/^<label\b/);
    expect(markup).toContain('data-slot="label"');
    expect(markup).toContain('for="account-email"');
    expect(markup).toContain('aria-label="Email address"');
    expect(markup).toContain(
      "z-label flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed custom-label",
    );
    expect(markup).toContain(">Email</label>");
  });
});
