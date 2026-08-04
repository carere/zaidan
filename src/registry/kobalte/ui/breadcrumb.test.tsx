import { renderToString } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

describe("Breadcrumb", () => {
  it("renders the pinned accessible navigation and all public slots", () => {
    const markup = renderToString(() => (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Current page</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbList>
      </Breadcrumb>
    ));

    expect(markup).toMatch(/<nav\b[^>]*aria-label="breadcrumb"/);
    expect(markup).toContain('data-slot="breadcrumb"');
    expect(markup).toContain('data-slot="breadcrumb-list"');
    expect(markup).toContain('data-slot="breadcrumb-item"');
    expect(markup).toContain('data-slot="breadcrumb-link"');
    expect(markup).toContain('data-slot="breadcrumb-separator"');
    expect(markup).toContain('data-slot="breadcrumb-page"');
    expect(markup).toContain('data-slot="breadcrumb-ellipsis"');
    expect(markup).toContain('role="presentation"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('aria-disabled="true"');
  });

  it("renders a list-item separator with the default chevron", () => {
    const markup = renderToString(() => <BreadcrumbSeparator />);

    expect(markup).toContain("<li");
    expect(markup).toContain('data-slot="breadcrumb-separator"');
    expect(markup).toContain("<svg");
  });
});
