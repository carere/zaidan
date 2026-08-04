import { renderToString } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert";

describe("Alert", () => {
  it("renders the accessible default alert with title and description slots", () => {
    const markup = renderToString(() => (
      <Alert>
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>Your changes are now available.</AlertDescription>
      </Alert>
    ));

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('data-slot="alert"');
    expect(markup).toContain("z-alert-variant-default");
    expect(markup).toContain('data-slot="alert-title"');
    expect(markup).toContain('data-slot="alert-description"');
  });

  it("renders the destructive variant and action slot", () => {
    const markup = renderToString(() => (
      <Alert variant="destructive">
        <AlertTitle>Unable to save</AlertTitle>
        <AlertAction>
          <button type="button">Retry</button>
        </AlertAction>
      </Alert>
    ));

    expect(markup).toContain("z-alert-variant-destructive");
    expect(markup).toContain('data-slot="alert-action"');
    expect(markup).toContain("Retry");
  });
});
