// @vitest-environment happy-dom

import type { ComponentProps } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
});

describe("Collapsible browser behavior", () => {
  it("narrows change detail events by reason", () => {
    type OnOpenChange = NonNullable<ComponentProps<typeof Collapsible>["onOpenChange"]>;
    type ChangeDetails = Parameters<OnOpenChange>[1];

    const assertDetails = (details: ChangeDetails) => {
      if (details.reason === "trigger-press") {
        expectTypeOf(details.event).toEqualTypeOf<
          MouseEvent | PointerEvent | TouchEvent | KeyboardEvent
        >();
      } else {
        expectTypeOf(details.event).toEqualTypeOf<Event>();
      }
    };

    expectTypeOf(assertDetails).toBeFunction();
  });

  it("renders the pinned slots and connected expanded panel semantics", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Collapsible defaultOpen>
          <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
          <CollapsibleContent>Details</CollapsibleContent>
        </Collapsible>
      ),
      host,
    );

    const root = host.querySelector<HTMLElement>('[data-slot="collapsible"]');
    const trigger = host.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]');
    const content = host.querySelector<HTMLElement>('[data-slot="collapsible-content"]');

    expect(root?.hasAttribute("data-expanded")).toBe(true);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(trigger?.getAttribute("aria-controls")).toBe(content?.id);
    expect(content?.hasAttribute("data-expanded")).toBe(true);
  });

  it("provides cancellable Base UI-compatible change details before opening", () => {
    const onOpenChange = vi.fn((_open: boolean, details) => {
      expect(details.event).toBeInstanceOf(MouseEvent);
      expect(details.reason).toBe("trigger-press");
      expect(details.trigger?.textContent).toBe("Toggle details");
      details.cancel();
      expect(details.isCanceled).toBe(true);
    });
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Collapsible onOpenChange={onOpenChange}>
          <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
          <CollapsibleContent>Details</CollapsibleContent>
        </Collapsible>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]');
    trigger?.click();

    expect(onOpenChange).toHaveBeenCalledOnce();
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelector('[data-slot="collapsible-content"]')).toBeNull();
  });

  it("keeps a disabled trigger focusable while blocking pointer and keyboard interaction", () => {
    const onOpenChange = vi.fn();
    const onKeyDown = vi.fn();
    const onKeyUp = vi.fn();
    const onMouseDown = vi.fn();
    const onPointerDown = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Collapsible disabled onOpenChange={onOpenChange}>
          <CollapsibleTrigger
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onMouseDown={onMouseDown}
            onPointerDown={onPointerDown}
          >
            Toggle details
          </CollapsibleTrigger>
          <CollapsibleContent keepMounted>Details</CollapsibleContent>
        </Collapsible>
      ),
      host,
    );

    const root = host.querySelector<HTMLElement>('[data-slot="collapsible"]');
    const trigger = host.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]');
    const content = host.querySelector<HTMLElement>('[data-slot="collapsible-content"]');
    expect(root?.hasAttribute("data-disabled")).toBe(true);
    expect(trigger?.tagName).toBe("BUTTON");
    expect(trigger?.hasAttribute("data-disabled")).toBe(true);
    expect(trigger?.hasAttribute("disabled")).toBe(false);
    expect(trigger?.getAttribute("aria-disabled")).toBe("true");
    expect(trigger?.tabIndex).toBe(0);
    expect(content?.hasAttribute("data-disabled")).toBe(true);

    trigger?.focus();
    expect(document.activeElement).toBe(trigger);
    trigger?.click();
    trigger?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }),
    );
    trigger?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    trigger?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    trigger?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }),
    );
    trigger?.dispatchEvent(
      new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key: " " }),
    );

    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(onKeyDown).not.toHaveBeenCalled();
    expect(onKeyUp).not.toHaveBeenCalled();
    expect(onMouseDown).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onPointerDown).not.toHaveBeenCalled();
  });

  it("keeps findable content mounted and opens it through beforematch", () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Collapsible onOpenChange={onOpenChange}>
          <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
          <CollapsibleContent hiddenUntilFound>Findable details</CollapsibleContent>
        </Collapsible>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]');
    const content = host.querySelector<HTMLElement>('[data-slot="collapsible-content"]');
    expect(content?.getAttribute("hidden")).toBe("until-found");

    const event = new Event("beforematch", { bubbles: true });
    content?.dispatchEvent(event);

    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(content?.hasAttribute("hidden")).toBe(false);
    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ event, reason: "none" });
  });

  it("keeps a closed panel mounted when requested", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Collapsible>
          <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
          <CollapsibleContent keepMounted>Kept details</CollapsibleContent>
        </Collapsible>
      ),
      host,
    );

    const content = host.querySelector<HTMLElement>('[data-slot="collapsible-content"]');
    expect(content?.hidden).toBe(true);
    expect(content?.hasAttribute("data-closed")).toBe(true);
  });

  it("supports keyboard activation for a non-native trigger", () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Collapsible onOpenChange={onOpenChange}>
          <CollapsibleTrigger nativeButton={false}>Toggle details</CollapsibleTrigger>
          <CollapsibleContent>Details</CollapsibleContent>
        </Collapsible>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]');
    expect(trigger?.tagName).toBe("DIV");
    expect(trigger?.getAttribute("role")).toBe("button");
    expect(trigger?.tabIndex).toBe(0);

    const enter = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    });
    trigger?.dispatchEvent(enter);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ event: enter });

    const spaceDown = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: " ",
    });
    trigger?.dispatchEvent(spaceDown);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    const spaceUp = new KeyboardEvent("keyup", {
      bubbles: true,
      cancelable: true,
      key: " ",
    });
    trigger?.dispatchEvent(spaceUp);
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ event: spaceUp });
  });
});
