// @vitest-environment happy-dom

import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Input } from "./input";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
});

describe("Input", () => {
  it("provides a generated id while preserving an explicit id", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <>
          <Input class="custom-input" />
          <Input id="account-email" />
        </>
      ),
      host,
    );

    const [generated, explicit] = Array.from(host.querySelectorAll("input"));

    expect(generated.id).toMatch(/^base-ui-/);
    expect(generated.getAttribute("data-slot")).toBe("input");
    expect(generated.getAttribute("class")).toContain("z-input");
    expect(generated.getAttribute("class")).toContain("custom-input");
    expect(explicit.id).toBe("account-email");
  });

  it("exposes the Base UI disabled state on the native input", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(() => <Input disabled />, host);

    const input = host.querySelector("input");

    expect(input?.disabled).toBe(true);
    expect(input?.getAttribute("data-disabled")).toBe("");
    expect(input?.matches(":disabled")).toBe(true);
  });

  it("preserves native form, focus, input, keyboard, and invalid semantics", () => {
    const onFocus = vi.fn();
    const onInput = vi.fn();
    const onKeyDown = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <form>
          <label for="profile-email">Email</label>
          <Input
            id="profile-email"
            name="email"
            type="email"
            aria-invalid="true"
            required
            onFocus={onFocus}
            onInput={onInput}
            onKeyDown={onKeyDown}
          />
        </form>
      ),
      host,
    );

    const form = host.querySelector("form");
    const input = host.querySelector("input");
    input?.focus();
    if (input) {
      input.value = "hello@example.com";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "hello@example.com" }));
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    }

    expect(document.activeElement).toBe(input);
    expect(onFocus).toHaveBeenCalledOnce();
    expect(onInput).toHaveBeenCalledOnce();
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(input?.type).toBe("email");
    expect(input?.required).toBe(true);
    expect(input?.getAttribute("aria-invalid")).toBe("true");
    expect(new FormData(form ?? undefined).get("email")).toBe("hello@example.com");
  });
});
