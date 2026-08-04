// @vitest-environment happy-dom

import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";

let dispose: (() => void) | undefined;

afterEach(() => {
  vi.useRealTimers();
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
});

describe("ContextMenu", () => {
  it("renders the pinned slots, defaults, variants, and inset states", async () => {
    const host = document.createElement("div");
    const portalTarget = document.createElement("section");
    document.body.append(host, portalTarget);
    dispose = render(
      () => (
        <ContextMenu>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuPortal container={{ current: portalTarget }}>
            <span data-testid="portal-child" />
          </ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuLabel as="h3" inset>
                Actions
              </ContextMenuLabel>
              <ContextMenuItem inset variant="destructive">
                Delete
              </ContextMenuItem>
            </ContextMenuGroup>
            <ContextMenuCheckboxItem inset defaultChecked>
              Show labels
            </ContextMenuCheckboxItem>
            <ContextMenuRadioGroup defaultValue="comfortable">
              <ContextMenuRadioItem inset value="comfortable">
                Comfortable
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="context-menu-trigger"]');
    trigger?.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 24,
        clientY: 32,
      }),
    );
    await Promise.resolve();

    const content = document.body.querySelector<HTMLElement>('[data-slot="context-menu-content"]');
    const item = document.body.querySelector<HTMLElement>('[data-slot="context-menu-item"]');
    const label = document.body.querySelector<HTMLElement>('[data-slot="context-menu-label"]');
    const group = document.body.querySelector<HTMLElement>('[data-slot="context-menu-group"]');
    const checkbox = document.body.querySelector<HTMLElement>(
      '[data-slot="context-menu-checkbox-item"]',
    );
    const radio = document.body.querySelector<HTMLElement>('[data-slot="context-menu-radio-item"]');

    expect(portalTarget.querySelector('[data-slot="context-menu-portal"]')).not.toBeNull();
    expect(content?.className).toContain("z-context-menu-content-logical");
    expect(content?.className).toContain("z-menu-translucent");
    expect(content?.getAttribute("data-side")).toBe("right");
    expect(content?.getAttribute("data-align")).toBe("start");
    expect(content?.className).toContain("max-h-(--kb-popper-content-available-height)");
    expect(item?.getAttribute("data-inset")).toBe("true");
    expect(label?.getAttribute("data-inset")).toBe("true");
    expect(label?.tagName).toBe("H3");
    expect(group?.getAttribute("aria-labelledby")).toBe(label?.id);
    expect(item?.getAttribute("data-variant")).toBe("destructive");
    expect(checkbox?.getAttribute("data-inset")).toBe("true");
    expect(checkbox?.getAttribute("aria-checked")).toBe("true");
    expect(radio?.getAttribute("data-inset")).toBe("true");
    expect(radio?.getAttribute("aria-checked")).toBe("true");
  });

  it("supports default-open state and Base UI-compatible change details", async () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu defaultOpen onOpenChange={onOpenChange}>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Copy</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const content = document.body.querySelector<HTMLElement>('[data-slot="context-menu-content"]');
    expect(content).not.toBeNull();

    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Escape",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    content?.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({
      event,
      reason: "escape-key",
    });
    expect(content?.hasAttribute("data-closed")).toBe(true);
    content?.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.querySelector('[data-slot="context-menu-content"]')).toBeNull();
  });

  it("allows consumers to opt an Escape change into event propagation", () => {
    const bubbledKeyDown = vi.fn();
    const onOpenChange = vi.fn((open: boolean, details) => {
      if (!open) details.allowPropagation();
    });
    document.body.addEventListener("keydown", bubbledKeyDown);
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu defaultOpen onOpenChange={onOpenChange}>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Copy</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const content = document.body.querySelector<HTMLElement>('[data-slot="context-menu-content"]');
    content?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
    );

    expect(onOpenChange.mock.lastCall?.[1].isPropagationAllowed).toBe(true);
    expect(bubbledKeyDown).toHaveBeenCalledTimes(1);
    document.body.removeEventListener("keydown", bubbledKeyDown);
  });

  it("maps checkbox and radio changes to the pinned callback contract", () => {
    const onCheckedChange = vi.fn();
    const onValueChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuCheckboxItem onCheckedChange={onCheckedChange}>
              Show labels
            </ContextMenuCheckboxItem>
            <ContextMenuRadioGroup onValueChange={onValueChange}>
              <ContextMenuRadioItem value="comfortable">Comfortable</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const checkbox = document.body.querySelector<HTMLElement>(
      '[data-slot="context-menu-checkbox-item"]',
    );
    const checkboxEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    });
    checkbox?.dispatchEvent(checkboxEvent);

    expect(checkbox?.getAttribute("aria-checked")).toBe("true");
    expect(onCheckedChange.mock.lastCall?.[0]).toBe(true);
    expect(onCheckedChange.mock.lastCall?.[1]).toMatchObject({
      event: checkboxEvent,
      reason: "item-press",
    });

    const radio = document.body.querySelector<HTMLElement>('[data-slot="context-menu-radio-item"]');
    const radioEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    });
    radio?.dispatchEvent(radioEvent);

    expect(radio?.getAttribute("aria-checked")).toBe("true");
    expect(onValueChange.mock.lastCall?.[0]).toBe("comfortable");
    expect(onValueChange.mock.lastCall?.[1]).toMatchObject({
      event: radioEvent,
      reason: "item-press",
    });
  });

  it("keeps a disabled root inert and preserves the native context menu", () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu disabled onOpenChange={onOpenChange}>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Copy</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="context-menu-trigger"]');
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 12,
      clientY: 18,
    });
    trigger?.dispatchEvent(event);

    expect(trigger?.hasAttribute("data-disabled")).toBe(true);
    expect(event.defaultPrevented).toBe(false);
    expect(document.body.querySelector('[data-slot="context-menu-content"]')).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("ignores disabled and repeating item activations", async () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu defaultOpen onOpenChange={onOpenChange}>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem disabled>Disabled</ContextMenuItem>
            <ContextMenuItem>Active</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const items = document.body.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]');
    items[0]?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }),
    );
    items[1]?.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        repeat: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(
      document.body
        .querySelector<HTMLElement>('[data-slot="context-menu-content"]')
        ?.hasAttribute("data-expanded"),
    ).toBe(true);
  });

  it("keeps the menu open when an item opts out with closeOnClick", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem closeOnClick={false} label="Copy item">
              Copy
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const item = document.body.querySelector<HTMLElement>('[data-slot="context-menu-item"]');
    item?.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));

    const content = document.body.querySelector<HTMLElement>('[data-slot="context-menu-content"]');
    expect(content?.hasAttribute("data-expanded")).toBe(true);
    expect(content?.hasAttribute("data-closed")).toBe(false);
  });

  it("maps pinned content positioning props onto the Kobalte popper", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent align="end" alignOffset={-3} side="top" sideOffset={7}>
            <ContextMenuItem>Copy</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const content = document.body.querySelector<HTMLElement>('[data-slot="context-menu-content"]');
    expect(content?.getAttribute("data-side")).toBe("top");
    expect(content?.getAttribute("data-align")).toBe("end");
  });

  it("closes only the submenu on Escape and restores its trigger focus", async () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub defaultOpen onOpenChange={onOpenChange}>
              <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Developer tools</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const rootContent = document.body.querySelector<HTMLElement>(
      '[data-slot="context-menu-content"]',
    );
    const subTrigger = document.body.querySelector<HTMLElement>(
      '[data-slot="context-menu-sub-trigger"]',
    );
    const subContent = document.body.querySelector<HTMLElement>(
      '[data-slot="context-menu-sub-content"]',
    );
    expect(subContent).not.toBeNull();

    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Escape",
    });
    subContent?.dispatchEvent(event);
    await Promise.resolve();

    expect(rootContent?.hasAttribute("data-expanded")).toBe(true);
    expect(subContent?.hasAttribute("data-closed")).toBe(true);
    expect(subTrigger?.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(subTrigger);
    expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ event, reason: "escape-key" });
  });

  it("inherits closeParentOnEsc from the root", async () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu closeParentOnEsc defaultOpen onOpenChange={onOpenChange}>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub defaultOpen>
              <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Developer tools</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const subContent = document.body.querySelector<HTMLElement>(
      '[data-slot="context-menu-sub-content"]',
    );
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Escape",
    });
    subContent?.dispatchEvent(event);
    await Promise.resolve();

    expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ event, reason: "escape-key" });
  });

  it("supports submenu actions, retained unmounting, and navigation options", async () => {
    const actionsRef: { current: { close: () => void; unmount: () => void } | null } = {
      current: null,
    };
    const onOpenChange = vi.fn((open: boolean, details) => {
      if (!open) details.preventUnmountOnClose();
    });
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub
              actionsRef={actionsRef}
              defaultOpen
              highlightItemOnHover={false}
              loopFocus={false}
              onOpenChange={onOpenChange}
              orientation="horizontal"
            >
              <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>First</ContextMenuItem>
                <ContextMenuItem>Last</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const items = document.body.querySelectorAll<HTMLElement>(
      '[data-slot="context-menu-sub-content"] [data-slot="context-menu-item"]',
    );
    const hoverEvent = new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      pointerType: "mouse",
    });
    items[0]?.dispatchEvent(hoverEvent);
    expect(hoverEvent.defaultPrevented).toBe(true);

    items[1]?.focus();
    const navigationEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowRight",
    });
    items[1]?.dispatchEvent(navigationEvent);
    expect(navigationEvent.defaultPrevented).toBe(true);

    actionsRef.current?.close();
    await Promise.resolve();
    const retainedContent = document.body.querySelector<HTMLElement>(
      '[data-slot="context-menu-sub-content"]',
    );
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ reason: "imperative-action" });
    expect(retainedContent?.hasAttribute("data-closed")).toBe(true);

    actionsRef.current?.unmount();
    retainedContent?.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
    await Promise.resolve();
    expect(document.body.querySelector('[data-slot="context-menu-sub-content"]')).toBeNull();
  });

  it("keeps every descendant of a disabled submenu inert", async () => {
    const onSelect = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub defaultOpen disabled>
              <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onSelect={onSelect}>Developer tools</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const item = document.body.querySelector<HTMLElement>(
      '[data-slot="context-menu-sub-content"] [data-slot="context-menu-item"]',
    );
    item?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(item?.getAttribute("aria-disabled")).toBe("true");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("completes submenu changes after active animations settle", async () => {
    const actionsRef: { current: { close: () => void; unmount: () => void } | null } = {
      current: null,
    };
    const onOpenChange = vi.fn((open: boolean, details) => {
      if (!open) details.preventUnmountOnClose();
    });
    const onOpenChangeComplete = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub
              actionsRef={actionsRef}
              defaultOpen
              onOpenChange={onOpenChange}
              onOpenChangeComplete={onOpenChangeComplete}
            >
              <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Developer tools</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const subContent = document.body.querySelector<HTMLElement>(
      '[data-slot="context-menu-sub-content"]',
    );
    let finishAnimation: (() => void) | undefined;
    const finished = new Promise<void>((resolve) => {
      finishAnimation = resolve;
    });
    Object.defineProperty(subContent, "getAnimations", {
      value: () => [{ finished, playState: "running" }],
    });

    actionsRef.current?.close();
    await Promise.resolve();
    expect(onOpenChangeComplete).not.toHaveBeenCalled();

    finishAnimation?.();
    await finished;
    await Promise.resolve();
    expect(onOpenChangeComplete).toHaveBeenCalledWith(false);
  });

  it("honors a canceled root change and keeps the native trigger details", () => {
    const onOpenChange = vi.fn((_open: boolean, details) => details.cancel());
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu onOpenChange={onOpenChange}>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Copy</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="context-menu-trigger"]');
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 24,
      clientY: 32,
    });
    trigger?.dispatchEvent(event);

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
    expect(onOpenChange.mock.lastCall?.[1].event).toBe(event);
    expect(onOpenChange.mock.lastCall?.[1].reason).toBe("trigger-press");
    expect(onOpenChange.mock.lastCall?.[1].trigger).toBe(trigger);
    expect(document.body.querySelector('[data-slot="context-menu-content"]')).toBeNull();
  });

  it("opens touch and pen triggers at the pinned 500ms long-press threshold", async () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu onOpenChange={onOpenChange}>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Copy</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="context-menu-trigger"]');
    const event = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: 12,
      clientY: 18,
      pointerType: "touch",
    });
    trigger?.dispatchEvent(event);

    await vi.advanceTimersByTimeAsync(499);
    expect(document.body.querySelector('[data-slot="context-menu-content"]')).toBeNull();
    await vi.advanceTimersByTimeAsync(1);

    expect(document.body.querySelector('[data-slot="context-menu-content"]')).not.toBeNull();
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({
      event,
      reason: "trigger-press",
      trigger,
    });
  });

  it("uses the pinned submenu hover delay", async () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub onOpenChange={onOpenChange}>
              <ContextMenuSubTrigger delay={250}>More tools</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Developer tools</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      ),
      host,
    );

    const subTrigger = document.body.querySelector<HTMLElement>(
      '[data-slot="context-menu-sub-trigger"]',
    );
    subTrigger?.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
      }),
    );

    await vi.advanceTimersByTimeAsync(100);
    expect(document.body.querySelector('[data-slot="context-menu-sub-content"]')).toBeNull();
    await vi.advanceTimersByTimeAsync(150);
    expect(document.body.querySelector('[data-slot="context-menu-sub-content"]')).not.toBeNull();
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ reason: "trigger-hover" });
  });
});
