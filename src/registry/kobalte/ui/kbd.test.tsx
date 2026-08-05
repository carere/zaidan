import { renderToString } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import { Kbd, KbdGroup } from "./kbd";

describe("Kbd", () => {
  it("renders a key with the pinned semantic and styling contract", () => {
    const markup = renderToString(() => (
      <Kbd title="Command key" class="custom-key">
        ⌘
      </Kbd>
    ));

    expect(markup).toMatch(/^<kbd\b/);
    expect(markup).toContain('data-slot="kbd"');
    expect(markup).toContain('title="Command key"');
    expect(markup).toContain(
      "z-kbd pointer-events-none inline-flex items-center justify-center select-none custom-key",
    );
    expect(markup).toContain(">⌘</kbd>");
  });

  it("renders a group with the pinned keyboard-input semantics", () => {
    const markup = renderToString(() => (
      <KbdGroup aria-label="Save shortcut" class="custom-group">
        <Kbd>Ctrl</Kbd>
        <Kbd>S</Kbd>
      </KbdGroup>
    ));

    expect(markup).toMatch(/^<kbd\b/);
    expect(markup).toContain('data-slot="kbd-group"');
    expect(markup).toContain('aria-label="Save shortcut"');
    expect(markup).toContain("z-kbd-group inline-flex items-center custom-group");
    expect(markup.match(/data-slot="kbd"/g)).toHaveLength(2);
    expect(markup).toMatch(/<\/kbd>$/);
  });
});
