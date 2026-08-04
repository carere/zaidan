import { renderToString } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "./bubble";

describe("Bubble", () => {
  it("renders the pinned default Bubble contract", () => {
    const markup = renderToString(() => (
      <BubbleGroup>
        <Bubble>
          <BubbleContent>Hello</BubbleContent>
          <BubbleReactions>Like</BubbleReactions>
        </Bubble>
      </BubbleGroup>
    ));

    expect(markup).toContain('data-slot="bubble-group"');
    expect(markup).toContain('data-slot="bubble"');
    expect(markup).toContain('data-variant="default"');
    expect(markup).toContain('data-align="start"');
    expect(markup).toContain("z-bubble-variant-default");
    expect(markup).toContain('data-slot="bubble-content"');
    expect(markup).toContain('data-slot="bubble-reactions"');
    expect(markup).toContain('data-side="bottom"');
    expect(markup).toContain('data-align="end"');
  });

  it("preserves variants, positioning, and native interactive semantics", () => {
    const markup = renderToString(() => (
      <Bubble variant="destructive" align="end" aria-label="Failed message">
        <BubbleContent as="button" type="button">
          Retry
        </BubbleContent>
        <BubbleReactions side="top" align="start">
          Dislike
        </BubbleReactions>
      </Bubble>
    ));

    expect(markup).toContain('data-variant="destructive"');
    expect(markup).toContain('data-align="end"');
    expect(markup).toContain('aria-label="Failed message"');
    expect(markup).toContain("z-bubble-variant-destructive");
    expect(markup).toMatch(/<button[^>]*data-slot="bubble-content"/);
    expect(markup).toContain('type="button"');
    expect(markup).toContain('data-side="top"');
    expect(markup).toContain('data-align="start"');
  });
});
