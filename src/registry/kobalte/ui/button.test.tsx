import { renderToString } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import { Button, buttonVariants } from "./button";

const variants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const sizes = ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] as const;

describe("Button", () => {
  it("renders the pinned default button contract", () => {
    const markup = renderToString(() => <Button disabled>Save</Button>);

    expect(markup).toMatch(/<button\b/);
    expect(markup).toContain('type="button"');
    expect(markup).toContain('data-slot="button"');
    expect(markup).toContain("z-button-variant-default");
    expect(markup).toContain("z-button-size-default");
    expect(markup).toMatch(/<button\b[^>]*\sdisabled(?:\s|>)/);
    expect(markup).toContain('data-disabled=""');
    expect(markup).not.toContain("aria-disabled");
    expect(markup).not.toContain("active:not-aria-[haspopup]:translate-y-px");
  });

  it.each(variants)("exposes the %s variant", (variant) => {
    expect(buttonVariants({ variant })).toContain(`z-button-variant-${variant}`);
  });

  it.each(sizes)("exposes the %s size", (size) => {
    expect(buttonVariants({ size })).toContain(`z-button-size-${size}`);
  });

  it("preserves variants, sizes, custom classes, and polymorphic link semantics", () => {
    const markup = renderToString(() => (
      <Button as="a" href="/settings" variant="outline" size="icon-sm" class="custom-button">
        Settings
      </Button>
    ));

    expect(markup).toContain("z-button-variant-outline");
    expect(markup).toContain("z-button-size-icon-sm");
    expect(markup).toContain("custom-button");
    expect(markup).toContain('href="/settings"');
    expect(markup).toContain(">Settings</a>");
  });
});
