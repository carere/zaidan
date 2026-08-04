// @vitest-environment happy-dom

import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

let dispose: (() => void) | undefined;
type ChangeDetails = Parameters<NonNullable<Parameters<typeof Accordion>[0]["onValueChange"]>>[1];

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
});

function mountAccordion(
  props: {
    disabled?: boolean;
    onValueChange?: (value: string[], details: ChangeDetails) => void;
  } = {},
) {
  const host = document.createElement("div");
  document.body.append(host);
  dispose = render(
    () => (
      <Accordion disabled={props.disabled} onValueChange={props.onValueChange}>
        <AccordionItem value="shipping">
          <AccordionTrigger>Shipping</AccordionTrigger>
          <AccordionContent>Shipping details</AccordionContent>
        </AccordionItem>
        <AccordionItem value="returns">
          <AccordionTrigger>Returns</AccordionTrigger>
          <AccordionContent>Return details</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
    host,
  );

  return Array.from(host.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]'));
}

function press(target: HTMLElement, key: string) {
  target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }));
}

describe("Accordion browser behavior", () => {
  it("leaves Arrow, Home, and End focus behavior to the browser", () => {
    const [shipping] = mountAccordion();
    shipping.focus();

    for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) {
      press(shipping, key);
      expect(document.activeElement).toBe(shipping);
    }
  });

  it("opens and closes a single item by keyboard by default", () => {
    const onValueChange = vi.fn();
    const [shipping] = mountAccordion({ onValueChange });

    press(shipping, "Enter");
    expect(shipping.getAttribute("aria-expanded")).toBe("true");
    expect(onValueChange.mock.lastCall?.[0]).toEqual(["shipping"]);

    press(shipping, "Enter");
    expect(shipping.getAttribute("aria-expanded")).toBe("false");
    expect(onValueChange.mock.lastCall?.[0]).toEqual([]);
  });

  it("keeps disabled triggers focusable while blocking interaction", () => {
    const onValueChange = vi.fn();
    const [shipping] = mountAccordion({ disabled: true, onValueChange });

    expect(shipping.tagName).toBe("DIV");
    expect(shipping.getAttribute("aria-disabled")).toBe("true");
    expect(shipping.tabIndex).toBe(0);
    shipping.focus();
    expect(document.activeElement).toBe(shipping);

    const tabEvent = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Tab" });
    shipping.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(false);

    press(shipping, "Enter");
    shipping.click();
    expect(shipping.getAttribute("aria-expanded")).toBe("false");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("provides cancellable item and root callbacks before applying state", () => {
    const calls: string[] = [];
    const rootChange = vi.fn((_value: string[], details: ChangeDetails) => {
      calls.push("root");
      expect(details.event).toBeInstanceOf(KeyboardEvent);
      expect(details.reason).toBe("trigger-press");
      expect(details.trigger?.textContent).toContain("Shipping");
      details.cancel();
      expect(details.isCanceled).toBe(true);
    });
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Accordion onValueChange={rootChange}>
          <AccordionItem
            onOpenChange={(_open, details) => {
              calls.push("item");
              details.allowPropagation();
              expect(details.isPropagationAllowed).toBe(true);
            }}
            value="shipping"
          >
            <AccordionTrigger>Shipping</AccordionTrigger>
            <AccordionContent>Details</AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="accordion-trigger"]');
    expect(trigger).not.toBeNull();
    if (trigger) press(trigger, "Enter");

    expect(calls).toEqual(["item", "root"]);
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
  });

  it("lets an item callback cancel before the root callback", () => {
    const rootChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Accordion onValueChange={rootChange}>
          <AccordionItem onOpenChange={(_open, details) => details.cancel()} value="shipping">
            <AccordionTrigger>Shipping</AccordionTrigger>
            <AccordionContent>Details</AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="accordion-trigger"]');
    trigger?.click();
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(rootChange).not.toHaveBeenCalled();
  });

  it("preserves non-string values through the Base UI-compatible callback", () => {
    const value = { id: 7 };
    const onValueChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Accordion onValueChange={onValueChange}>
          <AccordionItem value={value}>
            <AccordionTrigger>Object value</AccordionTrigger>
            <AccordionContent>Details</AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="accordion-trigger"]');
    expect(trigger).not.toBeNull();
    trigger?.click();
    expect(onValueChange.mock.lastCall?.[0]).toEqual([value]);
  });

  it("supports panel-level keepMounted and hiddenUntilFound", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Accordion>
          <AccordionItem value="kept">
            <AccordionTrigger>Kept</AccordionTrigger>
            <AccordionContent keepMounted>Kept details</AccordionContent>
          </AccordionItem>
          <AccordionItem value="findable">
            <AccordionTrigger>Findable</AccordionTrigger>
            <AccordionContent hiddenUntilFound>Findable details</AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      host,
    );

    const panels = Array.from(
      host.querySelectorAll<HTMLElement>('[data-slot="accordion-content"]'),
    );
    expect(panels).toHaveLength(2);
    expect(panels[0]?.hidden).toBe(true);
    expect(panels[1]?.getAttribute("hidden")).toBe("until-found");
  });

  it("opens a hidden-until-found item through beforematch", () => {
    const onValueChange = vi.fn();
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Accordion onValueChange={onValueChange}>
          <AccordionItem onOpenChange={onOpenChange} value="findable">
            <AccordionTrigger>Findable</AccordionTrigger>
            <AccordionContent hiddenUntilFound>Findable details</AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="accordion-trigger"]');
    const panel = host.querySelector<HTMLElement>('[data-slot="accordion-content"]');
    expect(panel?.getAttribute("hidden")).toBe("until-found");

    const event = new Event("beforematch", { bubbles: true });
    panel?.dispatchEvent(event);

    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(panel?.hasAttribute("hidden")).toBe(false);
    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ event, reason: "none" });
    expect(onValueChange.mock.lastCall?.[0]).toEqual(["findable"]);
  });

  it("keeps a non-native enabled trigger in the tab order", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Accordion>
          <AccordionItem value="custom">
            <AccordionTrigger nativeButton={false}>Custom trigger</AccordionTrigger>
            <AccordionContent>Details</AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="accordion-trigger"]');
    expect(trigger?.tagName).toBe("DIV");
    expect(trigger?.getAttribute("role")).toBe("button");
    expect(trigger?.tabIndex).toBe(0);
  });
});
