import { renderToString } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./avatar";

describe("Avatar", () => {
  it("renders the pinned root, fallback, badge, and group slots", () => {
    const markup = renderToString(() => (
      <AvatarGroup>
        <Avatar size="lg">
          <AvatarImage alt="Avatar test image" src="/avatar.png" />
          <AvatarFallback>AZ</AvatarFallback>
          <AvatarBadge>online</AvatarBadge>
        </Avatar>
        <AvatarGroupCount>+2</AvatarGroupCount>
      </AvatarGroup>
    ));

    expect(markup).toContain('data-slot="avatar-group"');
    expect(markup).toContain('data-slot="avatar"');
    expect(markup).toContain('data-size="lg"');
    expect(markup).toContain('data-slot="avatar-fallback"');
    expect(markup).toContain('data-slot="avatar-badge"');
    expect(markup).toContain('data-slot="avatar-group-count"');
    expect(markup).toContain("z-avatar");
    expect(markup).toContain("z-avatar-fallback");
    expect(markup).not.toContain('data-slot="avatar-image"');
  });

  it("uses the upstream default size when none is supplied", () => {
    const markup = renderToString(() => <Avatar />);

    expect(markup).toContain('data-size="default"');
  });
});
