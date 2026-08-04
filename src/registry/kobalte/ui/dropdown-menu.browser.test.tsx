// @vitest-environment happy-dom

import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
});

describe("Dropdown Menu browser behavior", () => {
  it("can disable hover highlighting and keyboard focus looping", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu defaultOpen highlightItemOnHover={false} loopFocus={false}>
          <DropdownMenuTrigger>Configured behavior</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>First</DropdownMenuItem>
            <DropdownMenuItem>Last</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    const [first, last] = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]'),
    );
    first?.focus();
    last?.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 10,
        pointerType: "mouse",
      }),
    );
    expect(document.activeElement).toBe(first);
    expect(last?.hasAttribute("data-highlighted")).toBe(false);

    first?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowUp" }),
    );
    expect(document.activeElement).toBe(first);
  });

  it("reports and can cancel outside-pointer dismissal", async () => {
    const openChanges = vi.fn((open: boolean, details) => {
      if (!open && details.reason === "outside-press") details.cancel();
    });
    const host = document.createElement("div");
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.append(host, outside);
    dispose = render(
      () => (
        <DropdownMenu defaultOpen onOpenChange={openChanges}>
          <DropdownMenuTrigger>Dismissable menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Action</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    outside.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }),
    );
    await Promise.resolve();

    expect(openChanges).toHaveBeenCalledOnce();
    expect(openChanges.mock.lastCall?.[0]).toBe(false);
    expect(openChanges.mock.lastCall?.[1]).toMatchObject({
      event: expect.any(Event),
      isCanceled: true,
      reason: "outside-press",
    });
    expect(
      host.querySelector('[data-slot="dropdown-menu-trigger"]')?.getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("opens and closes from hover using the configured delays", async () => {
    const openChanges = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu onOpenChange={openChanges}>
          <DropdownMenuTrigger closeDelay={1} delay={1} openOnHover>
            Hover menu
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Action</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]');
    trigger?.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(openChanges.mock.lastCall?.[1]).toMatchObject({ reason: "trigger-hover" });

    trigger?.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(openChanges.mock.lastCall?.[1]).toMatchObject({ reason: "trigger-hover" });
  });

  it("requests controlled submenu state from its public trigger", async () => {
    const subChanges = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Root menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub open={false} onOpenChange={subChanges}>
              <DropdownMenuSubTrigger>Controlled child</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>Child content</DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    await Promise.resolve();
    const subTrigger = document.querySelector<HTMLElement>(
      '[data-slot="dropdown-menu-sub-trigger"]',
    );
    subTrigger?.click();

    expect(subChanges).toHaveBeenCalledOnce();
    expect(subChanges.mock.lastCall?.[0]).toBe(true);
    expect(subChanges.mock.lastCall?.[1]).toMatchObject({
      event: expect.any(MouseEvent),
      reason: "trigger-press",
      trigger: subTrigger,
    });
    expect(subTrigger?.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[data-slot="dropdown-menu-sub-content"]')).toBeNull();
  });

  it("supports configurable submenu hover opening and closing", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Root menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger openOnHover={false}>Click only</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>Click-only content</DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger closeDelay={1} delay={1} openOnHover>
                Hover child
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>Hover content</DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    await Promise.resolve();
    const [clickOnly, hoverChild] = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-sub-trigger"]'),
    );
    clickOnly.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 110));
    expect(clickOnly.getAttribute("aria-expanded")).toBe("false");

    hoverChild.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(hoverChild.getAttribute("aria-expanded")).toBe("true");

    hoverChild.dispatchEvent(
      new PointerEvent("pointerleave", { cancelable: true, pointerType: "mouse" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(hoverChild.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes only the submenu on Escape and restores its trigger focus", async () => {
    const rootChanges = vi.fn();
    const subChanges = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu defaultOpen onOpenChange={rootChanges}>
          <DropdownMenuTrigger>Root menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub defaultOpen onOpenChange={subChanges}>
              <DropdownMenuSubTrigger>More actions</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Nested action</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    await Promise.resolve();
    const rootTrigger = host.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]');
    const subTrigger = document.querySelector<HTMLElement>(
      '[data-slot="dropdown-menu-sub-trigger"]',
    );
    const nestedItem = document.querySelector<HTMLElement>(
      '[data-slot="dropdown-menu-sub-content"] [data-slot="dropdown-menu-item"]',
    );
    nestedItem?.focus();
    nestedItem?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(subChanges).toHaveBeenCalledOnce();
    expect(subChanges.mock.lastCall?.[0]).toBe(false);
    expect(subChanges.mock.lastCall?.[1]).toMatchObject({
      event: expect.any(KeyboardEvent),
      reason: "escape-key",
    });
    expect(rootChanges).not.toHaveBeenCalled();
    expect(rootTrigger?.getAttribute("aria-expanded")).toBe("true");
    expect(subTrigger?.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(subTrigger);
  });

  it("supports keyboard navigation, disabled-item skipping, Escape, and focus return", async () => {
    const openChanges = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu onOpenChange={openChanges}>
          <DropdownMenuTrigger>Keyboard menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>First</DropdownMenuItem>
            <DropdownMenuItem disabled>Disabled</DropdownMenuItem>
            <DropdownMenuItem>Last</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]');
    trigger?.focus();
    trigger?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }),
    );
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 5));

    const [first, disabled, last] = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]'),
    );
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(first);
    expect(first?.hasAttribute("data-highlighted")).toBe(true);
    expect(disabled?.getAttribute("aria-disabled")).toBe("true");

    first?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }),
    );
    expect(document.activeElement).toBe(last);

    last?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Home" }),
    );
    expect(document.activeElement).toBe(first);

    first?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(openChanges.mock.lastCall?.[0]).toBe(false);
    expect(openChanges.mock.lastCall?.[1]).toMatchObject({
      event: expect.any(KeyboardEvent),
      reason: "escape-key",
    });
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("honors item closeOnClick and destructive behavior", async () => {
    const openChanges = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu defaultOpen onOpenChange={openChanges}>
          <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem closeOnClick={false}>Keep open</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    await Promise.resolve();
    const [keepOpen, destructive] = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]'),
    );
    expect(destructive?.dataset.variant).toBe("destructive");

    keepOpen?.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, button: 0, pointerType: "mouse" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(openChanges).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')).not.toBeNull();

    destructive?.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, button: 0, pointerType: "mouse" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(openChanges).toHaveBeenCalledOnce();
    expect(openChanges.mock.lastCall?.[0]).toBe(false);
    expect(openChanges.mock.lastCall?.[1]).toMatchObject({
      event: expect.any(PointerEvent),
      reason: "item-press",
      trigger: destructive,
    });
    expect(
      document
        .querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]')
        ?.hasAttribute("data-closed"),
    ).toBe(true);
    expect(
      host.querySelector('[data-slot="dropdown-menu-trigger"]')?.getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("supports cancellable checkbox state and controlled radio state", async () => {
    const checkboxChanges = vi.fn((_checked: boolean, details) => details.cancel());
    const radioChanges = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Preferences</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={checkboxChanges}>
              Show toolbar
            </DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value="compact" onValueChange={radioChanges}>
              <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="roomy">Roomy</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    await Promise.resolve();
    const checkbox = document.querySelector<HTMLElement>(
      '[data-slot="dropdown-menu-checkbox-item"]',
    );
    const [compact, roomy] = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-radio-item"]'),
    );

    expect(checkbox?.getAttribute("role")).toBe("menuitemcheckbox");
    expect(checkbox?.getAttribute("aria-checked")).toBe("false");
    expect(compact?.getAttribute("role")).toBe("menuitemradio");
    expect(compact?.getAttribute("aria-checked")).toBe("true");
    expect(roomy?.getAttribute("aria-checked")).toBe("false");

    checkbox?.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, button: 0, pointerType: "mouse" }),
    );
    expect(checkboxChanges).toHaveBeenCalledOnce();
    expect(checkboxChanges.mock.lastCall?.[0]).toBe(true);
    expect(checkboxChanges.mock.lastCall?.[1]).toMatchObject({
      event: expect.any(PointerEvent),
      isCanceled: true,
      reason: "item-press",
      trigger: checkbox,
    });
    expect(checkbox?.getAttribute("aria-checked")).toBe("false");
    expect(
      checkbox?.querySelector('[data-slot="dropdown-menu-checkbox-item-indicator"] svg'),
    ).toBeNull();

    roomy?.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, button: 0, pointerType: "mouse" }),
    );
    expect(radioChanges).toHaveBeenCalledOnce();
    expect(radioChanges.mock.lastCall?.[0]).toBe("roomy");
    expect(radioChanges.mock.lastCall?.[1]).toMatchObject({
      event: expect.any(PointerEvent),
      reason: "item-press",
      trigger: roomy,
    });
    expect(compact?.getAttribute("aria-checked")).toBe("true");
    expect(roomy?.getAttribute("aria-checked")).toBe("false");
  });

  it("propagates root disabled state and blocks pointer interaction", async () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <>
          <DropdownMenu disabled onOpenChange={onOpenChange}>
            <DropdownMenuTrigger delay={0} openOnHover>
              Disabled trigger
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Hidden action</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu defaultOpen disabled>
            <DropdownMenuTrigger>Rendered disabled trigger</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Item</DropdownMenuItem>
              <DropdownMenuCheckboxItem>Checkbox</DropdownMenuCheckboxItem>
              <DropdownMenuRadioGroup>
                <DropdownMenuRadioItem value="radio">Radio</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Submenu</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>Nested</DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ),
      host,
    );

    await Promise.resolve();
    const [closedTrigger, renderedTrigger] = Array.from(
      host.querySelectorAll<HTMLButtonElement>('[data-slot="dropdown-menu-trigger"]'),
    );
    closedTrigger.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }),
    );
    closedTrigger.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(closedTrigger.disabled).toBe(true);
    expect(renderedTrigger.disabled).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(document.querySelectorAll('[data-slot="dropdown-menu-content"]')).toHaveLength(1);

    for (const slot of [
      "dropdown-menu-item",
      "dropdown-menu-checkbox-item",
      "dropdown-menu-radio-item",
      "dropdown-menu-sub-trigger",
    ]) {
      expect(
        document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)?.hasAttribute("data-disabled"),
        slot,
      ).toBe(true);
    }
  });

  it("requests controlled open state with Base-compatible event details", () => {
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu open={false} onOpenChange={onOpenChange}>
          <DropdownMenuTrigger>Open controlled menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Action</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]');
    trigger?.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }),
    );

    expect(onOpenChange).toHaveBeenCalledOnce();
    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({
      event: expect.any(PointerEvent),
      isCanceled: false,
      reason: "trigger-press",
      trigger,
    });
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')).toBeNull();
  });

  it("supports imperative close, trigger ids, and a disabled final-focus return", async () => {
    const actionsRef: {
      current: { close: () => void; unmount: () => void } | null;
    } = { current: null };
    const openChanges = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu
          actionsRef={actionsRef}
          defaultOpen
          onOpenChange={openChanges}
          triggerId="account-menu"
        >
          <DropdownMenuTrigger>Account</DropdownMenuTrigger>
          <DropdownMenuContent finalFocus={false}>
            <DropdownMenuItem>Profile</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    await Promise.resolve();
    const trigger = host.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]');
    const item = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-item"]');
    item?.focus();
    actionsRef.current?.close();
    await Promise.resolve();

    expect(trigger?.id).toBe("account-menu");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(openChanges.mock.lastCall?.[1]).toMatchObject({ reason: "imperative-action" });
    expect(document.activeElement).toBe(item);
  });

  it("keeps explicitly portaled content mounted when requested", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu>
          <DropdownMenuTrigger>Closed menu</DropdownMenuTrigger>
          <DropdownMenuPortal keepMounted>
            <span data-testid="kept-portal">Kept portal</span>
          </DropdownMenuPortal>
        </DropdownMenu>
      ),
      host,
    );

    await Promise.resolve();
    expect(document.querySelector('[data-testid="kept-portal"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="dropdown-menu-portal"]')).not.toBeNull();
  });

  it("renders the pinned slots and Base-style positioning contract", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent align="end" alignOffset={2} side="right" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel inset>Actions</DropdownMenuLabel>
              <DropdownMenuItem inset>
                Edit <DropdownMenuShortcut>E</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuCheckboxItem checked inset>
                Show toolbar
              </DropdownMenuCheckboxItem>
              <DropdownMenuRadioGroup value="compact">
                <DropdownMenuRadioItem inset value="compact">
                  Compact
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub defaultOpen>
              <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>Nested action</DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      host,
    );

    await Promise.resolve();
    await Promise.resolve();

    const slots = [
      "dropdown-menu-trigger",
      "dropdown-menu-content",
      "dropdown-menu-group",
      "dropdown-menu-label",
      "dropdown-menu-item",
      "dropdown-menu-checkbox-item",
      "dropdown-menu-checkbox-item-indicator",
      "dropdown-menu-radio-group",
      "dropdown-menu-radio-item",
      "dropdown-menu-radio-item-indicator",
      "dropdown-menu-separator",
      "dropdown-menu-shortcut",
      "dropdown-menu-sub-trigger",
      "dropdown-menu-sub-content",
    ];

    for (const slot of slots) {
      expect(document.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
    }

    const content = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]');
    expect(content?.className).toContain("z-dropdown-menu-content-logical");
    expect(content?.className).toContain("z-menu-translucent");
    expect(content?.className).toContain("max-h-(--kb-popper-content-available-height)");
    expect(content?.className).toContain("w-(--kb-popper-anchor-width)");
    expect(content?.dataset.side).toBe("right");
    expect(content?.dataset.align).toBe("end");

    const subContent = document.querySelector<HTMLElement>(
      '[data-slot="dropdown-menu-sub-content"]',
    );
    expect(subContent?.className).toContain("z-dropdown-menu-content");
    expect(subContent?.className).toContain("z-dropdown-menu-content-logical");

    for (const slot of [
      "dropdown-menu-label",
      "dropdown-menu-item",
      "dropdown-menu-checkbox-item",
      "dropdown-menu-radio-item",
      "dropdown-menu-sub-trigger",
    ]) {
      expect(
        document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)?.hasAttribute("data-inset"),
        slot,
      ).toBe(true);
    }
  });
});
