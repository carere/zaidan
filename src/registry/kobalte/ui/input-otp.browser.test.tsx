// @vitest-environment happy-dom

import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";

import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./input-otp";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
});

function mountInputOTP() {
  const host = document.createElement("div");
  document.body.append(host);
  dispose = render(
    () => (
      <InputOTP aria-label="Verification code" maxLength={2}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>
    ),
    host,
  );

  const input = host.querySelector<HTMLInputElement>("input");

  return { input, root: input?.parentElement };
}

describe("Input OTP browser behavior", () => {
  it("puts the pinned input-otp slot marker on the focusable input", () => {
    const { input, root } = mountInputOTP();

    expect(input?.getAttribute("data-slot")).toBe("input-otp");
    expect(root?.hasAttribute("data-slot")).toBe(false);
  });

  it("exposes the pinned root height variable used to size the hidden input", () => {
    const { input, root } = mountInputOTP();

    expect(root?.style.getPropertyValue("--root-height")).toBe(`${input?.clientHeight}px`);
    expect(input?.style.fontSize).toBe("var(--root-height)");
    expect(input?.style.letterSpacing).toBe("-0.5em");
  });

  it("forwards the pinned native input contract without imposing a digit pattern", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <InputOTP
          aria-label="Account code"
          class="custom-input"
          containerClass="custom-container"
          containerClassName="upstream-container"
          id="account-code"
          inputMode="text"
          maxLength={4}
          name="account-code"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      ),
      host,
    );

    const input = host.querySelector<HTMLInputElement>("input");
    const root = input?.parentElement;

    expect({
      autocomplete: input?.getAttribute("autocomplete"),
      id: input?.id,
      inputMode: input?.getAttribute("inputmode"),
      label: input?.getAttribute("aria-label"),
      maxLength: input?.maxLength,
      name: input?.name,
      spellcheck: input?.getAttribute("spellcheck"),
      textAlign: input?.style.textAlign,
    }).toEqual({
      autocomplete: "one-time-code",
      id: "account-code",
      inputMode: "text",
      label: "Account code",
      maxLength: 4,
      name: "account-code",
      spellcheck: "false",
      textAlign: "left",
    });
    expect(input?.getAttribute("pattern")).toBeNull();
    expect(input?.getAttribute("class")).toContain("custom-input");
    expect(root?.getAttribute("class")).toContain("custom-container");
    expect(root?.getAttribute("class")).toContain("upstream-container");
    expect(root?.hasAttribute("containerClassName")).toBe(false);
  });

  it("supports the pinned uncontrolled value and completion lifecycle", async () => {
    const changes: string[] = [];
    const solidChanges: string[] = [];
    const completions: string[] = [];
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <InputOTP
          aria-label="Recovery code"
          defaultValue="A"
          maxLength={2}
          onChange={(value) => changes.push(value)}
          onComplete={(value) => completions.push(value)}
          onValueChange={(value) => solidChanges.push(value)}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
          </InputOTPGroup>
        </InputOTP>
      ),
      host,
    );

    const input = host.querySelector<HTMLInputElement>("input");
    const slots = Array.from(host.querySelectorAll<HTMLElement>('[data-slot="input-otp-slot"]'));
    expect(input?.value).toBe("A");
    expect(slots.map((slot) => slot.textContent)).toEqual(["A", ""]);

    input?.focus();
    if (input) {
      input.value = "AB";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "B" }));
    }
    await Promise.resolve();

    expect(slots.map((slot) => slot.textContent)).toEqual(["A", "B"]);
    expect(changes).toEqual(["AB"]);
    expect(solidChanges).toEqual(["AB"]);
    expect(completions).toEqual(["AB"]);
  });

  it("restores the pinned default value when its form is reset", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <form>
          <InputOTP defaultValue="A" maxLength={1}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
            </InputOTPGroup>
          </InputOTP>
        </form>
      ),
      host,
    );

    const form = host.querySelector("form");
    const input = host.querySelector<HTMLInputElement>("input");
    const slot = host.querySelector<HTMLElement>('[data-slot="input-otp-slot"]');

    if (input) {
      input.value = "B";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "B" }));
    }
    expect(slot?.textContent).toBe("B");

    form?.reset();
    await new Promise((resolve) => window.setTimeout(resolve));

    expect(input?.value).toBe("A");
    expect(slot?.textContent).toBe("A");
  });

  it("exposes the pinned semantic separator", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(() => <InputOTPSeparator />, host);

    const separator = host.querySelector<HTMLElement>('[data-slot="input-otp-separator"]');

    expect(separator?.getAttribute("role")).toBe("separator");
    expect(separator?.hasAttribute("aria-hidden")).toBe(false);
  });

  it("maps the pinned password-manager strategy to the Solid primitive", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <InputOTP maxLength={1} pushPasswordManagerStrategy="none">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      ),
      host,
    );

    const input = host.querySelector<HTMLInputElement>("input");

    expect(input?.style.width).toBe("100%");
    expect(input?.hasAttribute("pushPasswordManagerStrategy")).toBe(false);
  });

  it("keeps the input within the container when no password-manager badge is present", () => {
    const { input } = mountInputOTP();

    expect(input?.style.width).toBe("100%");
    expect(input?.style.clipPath).toBe("");
  });

  it("matches the pinned focus heuristic when the hidden input occupies the badge probe", async () => {
    const { input } = mountInputOTP();
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => input,
    });

    try {
      input?.focus();
      await new Promise((resolve) => window.setTimeout(resolve));

      expect(input?.style.width).toBe("calc(100% + 40px)");
      expect(input?.style.clipPath).toBe("inset(0 40px 0 0)");
    } finally {
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: originalElementFromPoint,
      });
    }
  });

  it("creates badge space only after a supported password manager is detected on focus", async () => {
    document.body.append(document.createElement("com-1password-button"));
    const { input } = mountInputOTP();

    await new Promise((resolve) => window.setTimeout(resolve));

    expect(input?.style.width).toBe("100%");
    expect(input?.style.clipPath).toBe("");

    input?.focus();
    await new Promise((resolve) => window.setTimeout(resolve));

    expect(input?.style.width).toBe("calc(100% + 40px)");
    expect(input?.style.clipPath).toBe("inset(0 40px 0 0)");
  });

  it("preserves the pinned pointer affordance for editable and disabled inputs", () => {
    const editable = mountInputOTP();

    expect(editable.root?.style.cursor).toBe("text");

    dispose?.();
    document.body.replaceChildren();

    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <InputOTP disabled maxLength={1}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      ),
      host,
    );

    expect(host.querySelector<HTMLInputElement>("input")?.parentElement?.style.cursor).toBe(
      "default",
    );
  });

  it("applies the pinned paste transformer before updating slots", async () => {
    const changes: string[] = [];
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <InputOTP
          maxLength={4}
          onChange={(value) => changes.push(value)}
          pasteTransformer={(pasted) => pasted.replaceAll("-", "")}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      ),
      host,
    );

    const input = host.querySelector<HTMLInputElement>("input");
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "12-34");
    input?.focus();
    input?.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData }),
    );
    await Promise.resolve();

    expect(input?.value).toBe("1234");
    expect([input?.selectionStart, input?.selectionEnd]).toEqual([3, 4]);
    expect(changes).toEqual(["1234"]);
  });

  it("provides the pinned reactive render state", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <InputOTP
          aria-label="Rendered code"
          maxLength={2}
          placeholder="XY"
          render={({ isFocused, slots }) => (
            <output>
              {slots.map((slot) => slot.char ?? slot.placeholderChar ?? "_").join("")}:
              {String(isFocused)}
            </output>
          )}
        />
      ),
      host,
    );

    const input = host.querySelector<HTMLInputElement>("input");
    const output = host.querySelector<HTMLOutputElement>("output");
    expect(output?.textContent).toBe("XY:false");

    input?.focus();
    await Promise.resolve();

    expect(host.querySelector("output")?.textContent).toBe("XY:true");
  });

  it("clears the pinned hover render state when disabled", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    let disable = () => {};
    const Fixture = () => {
      const [disabled, setDisabled] = createSignal(false);
      disable = () => setDisabled(true);

      return (
        <InputOTP
          disabled={disabled()}
          maxLength={1}
          render={({ isHovering }) => <output>{String(isHovering)}</output>}
        />
      );
    };
    dispose = render(() => <Fixture />, host);

    const input = host.querySelector<HTMLInputElement>("input");
    input?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await Promise.resolve();
    expect(host.querySelector("output")?.textContent).toBe("true");

    disable();
    await Promise.resolve();
    expect(host.querySelector("output")?.textContent).toBe("false");
  });
});
