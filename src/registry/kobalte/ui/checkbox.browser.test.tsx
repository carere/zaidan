// @vitest-environment happy-dom

import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Checkbox } from "./checkbox";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
});

function mountCheckbox() {
  const host = document.createElement("div");
  document.body.append(host);
  dispose = render(() => <Checkbox aria-label="Accept terms" />, host);

  return {
    control: host.querySelector<HTMLElement>('[data-slot="checkbox"]'),
    host,
    input: host.querySelector<HTMLInputElement>('input[type="checkbox"]'),
  };
}

function press(target: HTMLElement, key: string) {
  target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }));
  target.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key }));
}

describe("Checkbox browser behavior", () => {
  it("renders the pinned Base UI root and hidden input contract", () => {
    const { control, input } = mountCheckbox();

    expect(control?.tagName).toBe("SPAN");
    expect(control?.getAttribute("role")).toBe("checkbox");
    expect(control?.getAttribute("aria-checked")).toBe("false");
    expect(control?.hasAttribute("data-unchecked")).toBe(true);
    expect(control?.className).toContain("z-checkbox");
    expect(control?.tabIndex).toBe(0);
    expect(input?.getAttribute("aria-hidden")).toBe("true");
    expect(input?.tabIndex).toBe(-1);
    expect(input?.checked).toBe(false);
  });

  it("toggles by pointer with cancellable Base UI-compatible event details", () => {
    const changes: boolean[] = [];
    const modifiers: boolean[] = [];
    const host = document.createElement("div");
    document.body.append(host);
    const onCheckedChange = vi.fn((nextChecked: boolean, details) => {
      changes.push(nextChecked);
      expect(details.reason).toBe("none");
      expect(details.event).toBeInstanceOf(Event);
      expect(details.trigger).toBeUndefined();
      modifiers.push((details.event as MouseEvent).ctrlKey);
      if (!nextChecked) details.cancel();
    });
    dispose = render(
      () => <Checkbox aria-label="Accept terms" onCheckedChange={onCheckedChange} />,
      host,
    );

    const control = host.querySelector<HTMLElement>('[data-slot="checkbox"]');
    const input = host.querySelector<HTMLInputElement>('input[type="checkbox"]');
    control?.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
    expect(control?.getAttribute("aria-checked")).toBe("true");
    expect(control?.hasAttribute("data-checked")).toBe(true);
    expect(input?.checked).toBe(true);

    control?.click();
    expect(changes).toEqual([true, false]);
    expect(modifiers).toEqual([true, false]);
    expect(control?.getAttribute("aria-checked")).toBe("true");
    expect(input?.checked).toBe(true);
  });

  it("toggles with Space but not Enter and keeps focus on the public control", () => {
    const { control, input } = mountCheckbox();
    expect(control).not.toBeNull();
    control?.focus();
    expect(document.activeElement).toBe(control);

    if (control) press(control, " ");
    expect(control?.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(control);

    if (control) press(control, "Enter");
    expect(control?.getAttribute("aria-checked")).toBe("true");

    input?.focus();
    expect(document.activeElement).toBe(control);
  });

  it("submits the owning form with Enter without toggling", async () => {
    const submit = vi.fn((event: Event) => event.preventDefault());
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <form onSubmit={submit}>
          <Checkbox aria-label="Submit preferences" />
          <button type="submit">Save</button>
        </form>
      ),
      host,
    );

    const control = host.querySelector<HTMLElement>('[data-slot="checkbox"]');
    if (control) press(control, "Enter");
    await Promise.resolve();

    expect(submit).toHaveBeenCalledOnce();
    expect(control?.getAttribute("aria-checked")).toBe("false");
  });

  it("allows an ancestor to cancel Enter form submission", async () => {
    const submit = vi.fn((event: Event) => event.preventDefault());
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <form onKeyDown={(event) => event.preventDefault()} onSubmit={submit}>
          <Checkbox aria-label="Keep editing" />
          <button type="submit">Save</button>
        </form>
      ),
      host,
    );

    const control = host.querySelector<HTMLElement>('[data-slot="checkbox"]');
    if (control) press(control, "Enter");
    await Promise.resolve();

    expect(submit).not.toHaveBeenCalled();
    expect(control?.getAttribute("aria-checked")).toBe("false");
  });

  it("blocks disabled and readonly interaction while exposing their states", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <>
          <Checkbox aria-label="Disabled" disabled />
          <Checkbox aria-label="Readonly" readOnly />
        </>
      ),
      host,
    );

    const [disabled, readonly] = Array.from(
      host.querySelectorAll<HTMLElement>('[data-slot="checkbox"]'),
    );
    disabled.click();
    readonly.click();

    expect(disabled.hasAttribute("data-disabled")).toBe(true);
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    expect(disabled.tabIndex).toBe(-1);
    expect(disabled.getAttribute("aria-checked")).toBe("false");
    expect(readonly.hasAttribute("data-readonly")).toBe(true);
    expect(readonly.getAttribute("aria-readonly")).toBe("true");
    expect(readonly.tabIndex).toBe(0);
    expect(readonly.getAttribute("aria-checked")).toBe("false");
  });

  it("represents indeterminate and controlled states without mutating controlled state", () => {
    const onCheckedChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <>
          <Checkbox aria-label="Mixed" indeterminate />
          <Checkbox aria-label="Controlled" checked onCheckedChange={onCheckedChange} />
        </>
      ),
      host,
    );

    const [mixed, controlled] = Array.from(
      host.querySelectorAll<HTMLElement>('[data-slot="checkbox"]'),
    );
    const [mixedInput] = Array.from(
      host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    );

    expect(mixed.getAttribute("aria-checked")).toBe("mixed");
    expect(mixed.hasAttribute("data-indeterminate")).toBe(true);
    expect(mixed.hasAttribute("data-checked")).toBe(false);
    expect(mixed.querySelector('[data-slot="checkbox-indicator"]')).not.toBeNull();
    expect(mixedInput.indeterminate).toBe(true);

    controlled.click();
    expect(onCheckedChange).toHaveBeenCalledWith(false, expect.any(Object));
    expect(controlled.getAttribute("aria-checked")).toBe("true");
  });

  it("submits checked and unchecked values and keeps the public id on the hidden input", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <form id="preferences">
          <label for="terms">Terms</label>
          <Checkbox id="terms" name="terms" value="accepted" uncheckedValue="declined" />
          <Checkbox aria-label="Native default value" defaultChecked name="native-default" />
        </form>
      ),
      host,
    );

    const form = host.querySelector<HTMLFormElement>("form");
    const label = host.querySelector<HTMLLabelElement>("label");
    const control = host.querySelector<HTMLElement>('[data-slot="checkbox"]');
    const input = host.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(input?.id).toBe("terms");
    expect(control?.id).not.toBe("terms");
    expect(label?.id).not.toBe("");
    expect(control?.getAttribute("aria-labelledby")).toBe(label?.id);
    expect(new FormData(form ?? undefined).get("terms")).toBe("declined");
    expect(new FormData(form ?? undefined).get("native-default")).toBe("on");

    control?.click();
    expect(new FormData(form ?? undefined).get("terms")).toBe("accepted");
  });

  it("uses a native button only when requested by the Solid polymorphic API", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => <Checkbox aria-label="Native" id="native-checkbox" nativeButton />,
      host,
    );

    const control = host.querySelector<HTMLElement>('[data-slot="checkbox"]');
    const input = host.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(control?.tagName).toBe("BUTTON");
    expect(control?.getAttribute("type")).toBe("button");
    expect(control?.id).toBe("native-checkbox");
    expect(input?.hasAttribute("id")).toBe(false);
  });

  it("restores uncontrolled state when its form resets", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <form>
          <Checkbox aria-label="Resettable" defaultChecked />
        </form>
      ),
      host,
    );

    const form = host.querySelector<HTMLFormElement>("form");
    const control = host.querySelector<HTMLElement>('[data-slot="checkbox"]');
    control?.click();
    expect(control?.getAttribute("aria-checked")).toBe("false");

    form?.reset();
    expect(control?.getAttribute("aria-checked")).toBe("true");
  });
});
