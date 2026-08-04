// @vitest-environment happy-dom

import { For } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  Drawer,
  type DrawerActions,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
});

describe("Drawer browser behavior", () => {
  it("renders the pinned layered anatomy and directional state", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer defaultOpen showSwipeHandle swipeDirection="left">
          <DrawerTrigger>Open drawer</DrawerTrigger>
          <DrawerContent>
            <DrawerTitle>Preferences</DrawerTitle>
            <DrawerDescription>Update your preferences.</DrawerDescription>
          </DrawerContent>
        </Drawer>
      ),
      host,
    );

    const overlay = document.querySelector<HTMLElement>('[data-slot="drawer-overlay"]');
    const viewport = document.querySelector<HTMLElement>('[data-slot="drawer-viewport"]');
    const popup = document.querySelector<HTMLElement>('[data-slot="drawer-popup"]');
    const content = document.querySelector<HTMLElement>('[data-slot="drawer-content"]');
    const handle = document.querySelector<HTMLElement>('[data-slot="drawer-swipe-handle"]');

    expect(document.querySelector('[data-slot="drawer-portal"]')).not.toBeNull();
    expect(overlay).not.toBeNull();
    expect(viewport?.getAttribute("data-modal")).toBe("true");
    expect(popup?.getAttribute("role")).toBe("dialog");
    expect(popup?.getAttribute("aria-modal")).toBe("true");
    expect(popup?.getAttribute("data-swipe-direction")).toBe("left");
    expect(popup?.getAttribute("data-swipe-axis")).toBe("x");
    expect(popup?.className).toContain("z-drawer-popup");
    expect(content?.className).toContain("z-drawer-content-base");
    expect(handle?.getAttribute("aria-hidden")).toBe("true");
  });

  it("runs the uncontrolled trigger and close lifecycle with Base UI change details", () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer onOpenChange={onOpenChange}>
          <DrawerTrigger>Open drawer</DrawerTrigger>
          <DrawerContent>
            <DrawerTitle>Preferences</DrawerTitle>
            <DrawerDescription>Update your preferences.</DrawerDescription>
            <DrawerClose>Close drawer</DrawerClose>
          </DrawerContent>
        </Drawer>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]');
    trigger?.click();
    const popup = document.querySelector<HTMLElement>('[data-slot="drawer-popup"]');

    expect(popup?.hasAttribute("data-open")).toBe(true);
    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({
      event: expect.any(MouseEvent),
      reason: "trigger-press",
      trigger,
    });

    document.querySelector<HTMLButtonElement>('[data-slot="drawer-close"]')?.click();
    expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({
      event: expect.any(MouseEvent),
      reason: "close-press",
    });
    expect(popup?.hasAttribute("data-closed")).toBe(true);
  });

  it("does not mutate controlled state", () => {
    const controlledChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer open onOpenChange={controlledChange}>
          <DrawerContent>
            <DrawerTitle>Controlled</DrawerTitle>
            <DrawerDescription>Controlled drawer.</DrawerDescription>
            <DrawerClose>Close controlled</DrawerClose>
          </DrawerContent>
        </Drawer>
      ),
      host,
    );

    document.querySelector<HTMLButtonElement>('[data-slot="drawer-close"]')?.click();
    expect(controlledChange).toHaveBeenCalledWith(false, expect.any(Object));
    expect(
      document.querySelector<HTMLElement>('[data-slot="drawer-popup"]')?.hasAttribute("data-open"),
    ).toBe(true);
  });

  it("exposes open state only on the trigger that owns a controlled drawer", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer open triggerId="secondary-trigger">
          <DrawerTrigger id="primary-trigger">Primary</DrawerTrigger>
          <DrawerTrigger id="secondary-trigger">Secondary</DrawerTrigger>
          <DrawerContent>
            <DrawerTitle>Owned drawer</DrawerTitle>
            <DrawerDescription>Only the associated trigger owns this popup.</DrawerDescription>
          </DrawerContent>
        </Drawer>
      ),
      host,
    );

    const primary = host.querySelector<HTMLButtonElement>("#primary-trigger");
    const secondary = host.querySelector<HTMLButtonElement>("#secondary-trigger");
    const popup = document.querySelector<HTMLElement>('[data-slot="drawer-popup"]');

    expect(primary?.getAttribute("aria-expanded")).toBe("false");
    expect(primary?.hasAttribute("aria-controls")).toBe(false);
    expect(secondary?.getAttribute("aria-expanded")).toBe("true");
    expect(secondary?.getAttribute("aria-controls")).toBe(popup?.id);
  });

  it("transfers an open drawer and payload to an inactive trigger", () => {
    const onOpenChange = vi.fn();
    const primaryPayload = { label: "Primary" };
    const secondaryPayload = { label: "Secondary" };
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer<{ label: string }>
          defaultOpen
          defaultTriggerId="primary-owner"
          onOpenChange={onOpenChange}
        >
          {({ payload }) => (
            <>
              <DrawerTrigger id="primary-owner" payload={primaryPayload}>
                Primary
              </DrawerTrigger>
              <DrawerTrigger id="secondary-owner" payload={secondaryPayload}>
                Secondary
              </DrawerTrigger>
              <DrawerContent>
                <DrawerTitle>{payload?.label}</DrawerTitle>
                <DrawerDescription>Content follows its active trigger.</DrawerDescription>
              </DrawerContent>
            </>
          )}
        </Drawer>
      ),
      host,
    );

    const primary = host.querySelector<HTMLButtonElement>("#primary-owner");
    const secondary = host.querySelector<HTMLButtonElement>("#secondary-owner");
    secondary?.click();

    expect(document.querySelector('[data-slot="drawer-popup"]')?.hasAttribute("data-open")).toBe(
      true,
    );
    expect(primary?.getAttribute("aria-expanded")).toBe("false");
    expect(secondary?.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector('[data-slot="drawer-title"]')?.textContent).toBe("Secondary");
    expect(onOpenChange.mock.lastCall).toEqual([
      true,
      expect.objectContaining({ reason: "trigger-press", trigger: secondary }),
    ]);
  });

  it("honors canceled uncontrolled changes", () => {
    const canceledChange = vi.fn((_open: boolean, details) => details.cancel());
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer onOpenChange={canceledChange}>
          <DrawerTrigger>Open canceled</DrawerTrigger>
          <DrawerContent>
            <DrawerTitle>Canceled</DrawerTitle>
            <DrawerDescription>Canceled drawer.</DrawerDescription>
          </DrawerContent>
        </Drawer>
      ),
      host,
    );

    host.querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]')?.click();
    expect(canceledChange.mock.lastCall?.[1].isCanceled).toBe(true);
    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeNull();
  });

  it("closes on Escape with the keyboard reason", () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer defaultOpen onOpenChange={onOpenChange}>
          <DrawerContent>
            <DrawerTitle>Keyboard drawer</DrawerTitle>
            <DrawerDescription>Press Escape to close.</DrawerDescription>
          </DrawerContent>
        </Drawer>
      ),
      host,
    );

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
    );

    expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({
      event: expect.any(KeyboardEvent),
      reason: "escape-key",
    });
    expect(
      document
        .querySelector<HTMLElement>('[data-slot="drawer-popup"]')
        ?.hasAttribute("data-closed"),
    ).toBe(true);
  });

  it("closes the topmost Android drawer through CloseWatcher", () => {
    const parentChange = vi.fn();
    const childChange = vi.fn();
    const originalUserAgent = Object.getOwnPropertyDescriptor(window.navigator, "userAgent");
    const originalCloseWatcher = Object.getOwnPropertyDescriptor(window, "CloseWatcher");
    const watchers: TestCloseWatcher[] = [];
    class TestCloseWatcher extends EventTarget {
      destroyed = false;

      constructor() {
        super();
        watchers.push(this);
      }

      destroy() {
        this.destroyed = true;
      }
    }
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 15)",
    });
    Object.defineProperty(window, "CloseWatcher", {
      configurable: true,
      value: TestCloseWatcher,
    });

    try {
      const host = document.createElement("div");
      document.body.append(host);
      dispose = render(
        () => (
          <Drawer defaultOpen onOpenChange={parentChange}>
            <DrawerContent>
              <DrawerTitle>Parent Android drawer</DrawerTitle>
              <DrawerDescription>The parent yields system back to its child.</DrawerDescription>
              <Drawer defaultOpen onOpenChange={childChange}>
                <DrawerContent>
                  <DrawerTitle>Child Android drawer</DrawerTitle>
                  <DrawerDescription>The topmost drawer handles system back.</DrawerDescription>
                </DrawerContent>
              </Drawer>
            </DrawerContent>
          </Drawer>
        ),
        host,
      );

      const activeWatcher = watchers.find((watcher) => !watcher.destroyed);
      expect(watchers.some((watcher) => watcher.destroyed)).toBe(true);
      expect(watchers.filter((watcher) => !watcher.destroyed)).toHaveLength(1);

      activeWatcher?.dispatchEvent(new Event("close"));

      expect(parentChange).not.toHaveBeenCalled();
      expect(childChange.mock.lastCall?.[0]).toBe(false);
      expect(childChange.mock.lastCall?.[1]).toMatchObject({
        event: expect.any(Event),
        reason: "close-watcher",
      });
      expect(activeWatcher?.destroyed).toBe(true);
    } finally {
      if (originalUserAgent)
        Object.defineProperty(window.navigator, "userAgent", originalUserAgent);
      else Reflect.deleteProperty(window.navigator, "userAgent");
      if (originalCloseWatcher) Object.defineProperty(window, "CloseWatcher", originalCloseWatcher);
      else Reflect.deleteProperty(window, "CloseWatcher");
    }
  });

  it("keeps non-modal and trap-focus drawers non-blocking without backdrops", () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <>
          <Drawer defaultOpen modal={false}>
            <DrawerContent>
              <DrawerTitle>Non-modal</DrawerTitle>
              <DrawerDescription>Outside interaction remains available.</DrawerDescription>
            </DrawerContent>
          </Drawer>
          <Drawer defaultOpen modal="trap-focus">
            <DrawerContent>
              <DrawerTitle>Focus-only modal</DrawerTitle>
              <DrawerDescription>Focus remains trapped without a backdrop.</DrawerDescription>
            </DrawerContent>
          </Drawer>
        </>
      ),
      host,
    );

    expect(document.querySelector('[data-slot="drawer-overlay"]')).toBeNull();
    expect(
      Array.from(document.querySelectorAll<HTMLElement>('[data-slot="drawer-viewport"]')).map(
        (viewport) => viewport.getAttribute("data-modal"),
      ),
    ).toEqual(["false", "trap-focus"]);
    expect(
      Array.from(document.querySelectorAll<HTMLElement>('[data-slot="drawer-popup"]')).map(
        (popup) => popup.getAttribute("aria-modal"),
      ),
    ).toEqual(["false", "false"]);
  });

  it("moves focus into the drawer and restores it to the trigger", async () => {
    const interactionTypes: string[] = [];
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer>
          <DrawerTrigger>Open focus drawer</DrawerTrigger>
          <DrawerContent
            initialFocus={(interactionType) => {
              interactionTypes.push(interactionType);
              return document.querySelector<HTMLElement>("#drawer-initial-focus");
            }}
          >
            <DrawerTitle>Focus drawer</DrawerTitle>
            <DrawerDescription>Focus is managed on open and close.</DrawerDescription>
            <button id="drawer-initial-focus" type="button">
              First action
            </button>
            <DrawerClose>Close focus drawer</DrawerClose>
          </DrawerContent>
        </Drawer>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]');
    trigger?.focus();
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await Promise.resolve();

    expect(interactionTypes).toEqual(["mouse"]);
    expect(document.activeElement?.id).toBe("drawer-initial-focus");

    document.querySelector<HTMLButtonElement>('[data-slot="drawer-close"]')?.click();
    document
      .querySelector<HTMLElement>('[data-slot="drawer-popup"]')
      ?.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await Promise.resolve();
    expect(document.activeElement).toBe(trigger);
  });

  it("maps all four dismissal directions to the Corvu gesture side and axis", () => {
    const directions = ["down", "up", "left", "right"] as const;
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <>
          <For each={directions}>
            {(direction) => (
              <Drawer defaultOpen modal={false} swipeDirection={direction}>
                <DrawerContent>
                  <DrawerTitle>{direction}</DrawerTitle>
                  <DrawerDescription>{direction} drawer.</DrawerDescription>
                </DrawerContent>
              </Drawer>
            )}
          </For>
        </>
      ),
      host,
    );

    const popups = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="drawer-popup"]'));
    expect(popups.map((popup) => popup.getAttribute("data-swipe-direction"))).toEqual(directions);
    expect(popups.map((popup) => popup.getAttribute("data-side"))).toEqual([
      "bottom",
      "top",
      "left",
      "right",
    ]);
    expect(popups.map((popup) => popup.getAttribute("data-swipe-axis"))).toEqual([
      "y",
      "y",
      "x",
      "x",
    ]);
  });

  it("classifies keyboard-activated triggers for focus callbacks", async () => {
    const interactionTypes: string[] = [];
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer>
          <DrawerTrigger>Open with keyboard</DrawerTrigger>
          <DrawerContent
            initialFocus={(interactionType) => {
              interactionTypes.push(interactionType);
            }}
          >
            <DrawerTitle>Keyboard trigger</DrawerTitle>
            <DrawerDescription>Opened from the keyboard.</DrawerDescription>
          </DrawerContent>
        </Drawer>
      ),
      host,
    );

    host
      .querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    await Promise.resolve();

    expect(interactionTypes).toEqual(["keyboard"]);
  });

  it("connects detached triggers and renders their payload", () => {
    const handle = Drawer.createHandle<{ label: string }>();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <>
          <DrawerTrigger handle={handle} id="detached-trigger" payload={{ label: "Profile" }}>
            Open detached
          </DrawerTrigger>
          <Drawer handle={handle}>
            {({ payload }) => (
              <DrawerContent>
                <DrawerTitle>{payload?.label}</DrawerTitle>
                <DrawerDescription>Opened by a detached trigger.</DrawerDescription>
              </DrawerContent>
            )}
          </Drawer>
        </>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLButtonElement>("#detached-trigger");
    trigger?.click();

    expect(handle.isOpen).toBe(true);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector('[data-slot="drawer-title"]')?.textContent).toBe("Profile");
  });

  it("resets controlled snap points on close and keeps the closing transform", () => {
    const onSnapPointChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer
          defaultOpen
          defaultSnapPoint={0.25}
          onSnapPointChange={onSnapPointChange}
          snapPoint={0.5}
          snapPoints={[0.25, 0.5, 1]}
        >
          <DrawerContent>
            <DrawerTitle>Controlled snap point</DrawerTitle>
            <DrawerDescription>Closes from a controlled snap point.</DrawerDescription>
            <DrawerClose>Close drawer</DrawerClose>
          </DrawerContent>
        </Drawer>
      ),
      host,
    );

    const popup = document.querySelector<HTMLElement>('[data-slot="drawer-popup"]');
    expect(popup?.hasAttribute("data-expanded")).toBe(false);

    document.querySelector<HTMLButtonElement>('[data-slot="drawer-close"]')?.click();

    expect(onSnapPointChange).toHaveBeenCalledWith(
      0.25,
      expect.objectContaining({ reason: "close-press" }),
    );
    expect(popup?.style.transform).toBe("var(--closed-transform)");
  });

  it("supports imperative close, deferred unmount, and explicit unmount", () => {
    const actionsRef: { current: DrawerActions | null } = { current: null };
    const onOpenChange = vi.fn((open: boolean, details) => {
      if (!open) details.preventUnmountOnClose();
    });
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer actionsRef={actionsRef} defaultOpen onOpenChange={onOpenChange}>
          <DrawerContent>
            <DrawerTitle>Imperative drawer</DrawerTitle>
            <DrawerDescription>Managed by an actions ref.</DrawerDescription>
          </DrawerContent>
        </Drawer>
      ),
      host,
    );

    actionsRef.current?.close();
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ reason: "imperative-action" });
    expect(document.querySelector('[data-slot="drawer-portal"]')).not.toBeNull();
    expect(
      document
        .querySelector<HTMLElement>('[data-slot="drawer-popup"]')
        ?.hasAttribute("data-closed"),
    ).toBe(true);

    actionsRef.current?.unmount();
    expect(document.querySelector('[data-slot="drawer-portal"]')).toBeNull();
  });

  it("coordinates nested drawer state through the child exit transition", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <Drawer defaultOpen>
          <DrawerContent>
            <DrawerTitle>Parent drawer</DrawerTitle>
            <DrawerDescription>Contains another drawer.</DrawerDescription>
            <Drawer>
              <DrawerTrigger>Open nested drawer</DrawerTrigger>
              <DrawerContent>
                <DrawerTitle>Nested drawer</DrawerTitle>
                <DrawerDescription>Nested content.</DrawerDescription>
                <DrawerClose>Close nested drawer</DrawerClose>
              </DrawerContent>
            </Drawer>
          </DrawerContent>
        </Drawer>
      ),
      host,
    );

    document.querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]')?.click();

    const popups = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="drawer-popup"]'));
    expect(popups).toHaveLength(2);
    expect(popups[0]?.hasAttribute("data-nested-drawer-open")).toBe(true);
    expect(popups[1]?.hasAttribute("data-nested")).toBe(true);
    expect(document.querySelectorAll('[data-slot="drawer-overlay"]')).toHaveLength(1);

    document.querySelector<HTMLButtonElement>('[data-slot="drawer-close"]')?.click();
    expect(popups[0]?.hasAttribute("data-nested-drawer-open")).toBe(true);

    popups[1]?.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await Promise.resolve();
    expect(popups[0]?.hasAttribute("data-nested-drawer-open")).toBe(false);
  });
});
