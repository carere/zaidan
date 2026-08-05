// @vitest-environment happy-dom

import type { ComponentProps } from "solid-js";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createHoverCardHandle, HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("Hover Card browser behavior", () => {
  it("connects detached triggers and renders the active trigger payload", async () => {
    vi.useFakeTimers();
    const handle = createHoverCardHandle<{ name: string }>();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <>
          <HoverCardTrigger
            as="button"
            delay={1}
            handle={handle}
            id="ada-trigger"
            payload={{ name: "Ada" }}
          >
            Ada
          </HoverCardTrigger>
          <HoverCard handle={handle}>
            {({ payload }) => <HoverCardContent>{payload?.name ?? "No profile"}</HoverCardContent>}
          </HoverCard>
        </>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>("#ada-trigger");
    trigger?.dispatchEvent(
      new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }),
    );
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(handle.isOpen).toBe(true);
    expect(trigger?.hasAttribute("data-popup-open")).toBe(true);
    expect(document.body.querySelector('[data-slot="hover-card-content"]')?.textContent).toBe(
      "Ada",
    );
  });

  it("switches payload when another detached trigger becomes active", async () => {
    vi.useFakeTimers();
    const handle = createHoverCardHandle<{ name: string }>();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <>
          <HoverCardTrigger delay={1} handle={handle} id="ada" payload={{ name: "Ada" }}>
            Ada
          </HoverCardTrigger>
          <HoverCardTrigger delay={1} handle={handle} id="linus" payload={{ name: "Linus" }}>
            Linus
          </HoverCardTrigger>
          <HoverCard handle={handle}>
            {({ payload }) => <HoverCardContent>{payload?.name}</HoverCardContent>}
          </HoverCard>
        </>
      ),
      host,
    );

    host
      .querySelector<HTMLElement>("#ada")
      ?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));
    await vi.advanceTimersByTimeAsync(1);
    host
      .querySelector<HTMLElement>("#linus")
      ?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));
    await vi.advanceTimersByTimeAsync(1);

    expect(handle.isOpen).toBe(true);
    expect(host.querySelector("#ada")?.hasAttribute("data-popup-open")).toBe(false);
    expect(host.querySelector("#linus")?.hasAttribute("data-popup-open")).toBe(true);
    expect(document.body.querySelector('[data-slot="hover-card-content"]')?.textContent).toBe(
      "Linus",
    );
  });

  it("does not open when focus is acquired by a pointer press", async () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <HoverCard onOpenChange={onOpenChange}>
          <HoverCardTrigger as="button" delay={1}>
            Profile
          </HoverCardTrigger>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCard>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="hover-card-trigger"]');
    trigger?.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }),
    );
    trigger?.focus();
    await vi.advanceTimersByTimeAsync(1);

    expect(document.activeElement).toBe(trigger);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(document.body.querySelector('[data-slot="hover-card-content"]')).toBeNull();
  });

  it("keeps the active trigger when a controlled card accepts hover opening", async () => {
    vi.useFakeTimers();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(() => {
      const [open, setOpen] = createSignal(false);
      return (
        <HoverCard open={open()} onOpenChange={setOpen}>
          <HoverCardTrigger delay={1} href="/profile">
            Profile
          </HoverCardTrigger>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCard>
      );
    }, host);

    const trigger = host.querySelector<HTMLElement>('[data-slot="hover-card-trigger"]');
    trigger?.dispatchEvent(
      new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }),
    );
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(trigger?.hasAttribute("data-popup-open")).toBe(true);
    expect(document.body.querySelector('[data-slot="hover-card-content"]')).not.toBeNull();
  });

  it("honors Escape cancellation without preventing the native event", async () => {
    const onOpenChange = vi.fn((open: boolean, details) => {
      if (!open) {
        details.cancel();
        details.allowPropagation();
      }
    });
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <HoverCard defaultOpen onOpenChange={onOpenChange}>
          <HoverCardTrigger href="/profile">Profile</HoverCardTrigger>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCard>
      ),
      host,
    );

    await Promise.resolve();
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Escape",
    });
    document.body
      .querySelector<HTMLElement>('[data-slot="hover-card-content"]')
      ?.dispatchEvent(event);
    await Promise.resolve();

    expect(event.defaultPrevented).toBe(false);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({
      event,
      isCanceled: true,
      isPropagationAllowed: true,
      reason: "escape-key",
    });
    expect(document.body.querySelector('[data-slot="hover-card-content"]')).not.toBeNull();
  });

  it("preserves native button semantics for a polymorphic trigger", async () => {
    const TriggerButton = (props: ComponentProps<"button">) => <button {...props} />;
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <HoverCard>
          <HoverCardTrigger as={TriggerButton}>Profile</HoverCardTrigger>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCard>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="hover-card-trigger"]');
    await Promise.resolve();

    expect(trigger?.tagName).toBe("BUTTON");
    expect(trigger?.getAttribute("role")).toBe("button");
  });

  it("renders the pinned slots, position state, logical marker, and Base UI variables", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <HoverCard defaultOpen>
          <HoverCardTrigger href="/profile">Profile</HoverCardTrigger>
          <HoverCardContent align="end" alignOffset={3} side="top" sideOffset={7}>
            Profile preview
          </HoverCardContent>
        </HoverCard>
      ),
      host,
    );

    await Promise.resolve();
    const portal = document.body.querySelector<HTMLElement>('[data-slot="hover-card-portal"]');
    const trigger = host.querySelector<HTMLElement>('[data-slot="hover-card-trigger"]');
    const content = document.body.querySelector<HTMLElement>('[data-slot="hover-card-content"]');
    const positioner = content?.parentElement;

    expect(portal).not.toBeNull();
    expect(trigger?.hasAttribute("data-popup-open")).toBe(true);
    expect(content?.hasAttribute("data-open")).toBe(true);
    expect(content?.getAttribute("data-side")).toBe("top");
    expect(content?.getAttribute("data-align")).toBe("end");
    expect(content?.getAttribute("tabindex")).toBe("-1");
    expect(content?.hasAttribute("data-base-ui-focusable")).toBe(true);
    expect(content?.classList.contains("z-hover-card-content-logical")).toBe(true);
    expect(positioner?.classList.contains("isolate")).toBe(true);
    expect(positioner?.getAttribute("role")).toBe("presentation");
    expect(positioner?.hasAttribute("data-open")).toBe(true);
    expect(positioner?.getAttribute("data-side")).toBe("top");
    expect(positioner?.getAttribute("data-align")).toBe("end");
    expect(positioner?.hasAttribute("data-anchor-hidden")).toBe(false);
    expect(positioner?.style.getPropertyValue("--transform-origin")).toBe(
      "var(--kb-popper-content-transform-origin)",
    );
    expect(positioner?.style.getPropertyValue("--available-height")).toBe(
      "var(--kb-popper-content-available-height)",
    );
    expect(positioner?.style.getPropertyValue("--anchor-width")).toBe(
      "var(--kb-popper-anchor-width)",
    );

    positioner?.style.setProperty("visibility", "hidden");
    await Promise.resolve();
    expect(positioner?.hasAttribute("data-anchor-hidden")).toBe(true);
  });

  it("reports completion after an initially open card finishes mounting", async () => {
    const onOpenChangeComplete = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <HoverCard defaultOpen onOpenChangeComplete={onOpenChangeComplete}>
          <HoverCardTrigger href="/profile">Profile</HoverCardTrigger>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCard>
      ),
      host,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(onOpenChangeComplete).toHaveBeenCalledOnce();
    expect(onOpenChangeComplete).toHaveBeenCalledWith(true);
  });

  it("resolves functional offsets from the rendered anchor and positioner", async () => {
    const sideOffset = vi.fn(() => 9);
    const alignOffset = vi.fn(() => 6);
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <HoverCard defaultOpen>
          <HoverCardTrigger href="/profile">Profile</HoverCardTrigger>
          <HoverCardContent sideOffset={sideOffset} alignOffset={alignOffset}>
            Profile preview
          </HoverCardContent>
        </HoverCard>
      ),
      host,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(sideOffset).toHaveBeenCalledWith({
      align: "center",
      anchor: { height: 0, width: 0 },
      positioner: { height: 0, width: 0 },
      side: "bottom",
    });
    expect(alignOffset).toHaveBeenCalledWith({
      align: "center",
      anchor: { height: 0, width: 0 },
      positioner: { height: 0, width: 0 },
      side: "bottom",
    });
  });

  it("reports and can cancel mouse hover opening after the trigger delay", async () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn((_open: boolean, details) => details.cancel());
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <HoverCard onOpenChange={onOpenChange}>
          <HoverCardTrigger closeDelay={10} delay={20} href="/profile">
            Profile
          </HoverCardTrigger>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCard>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="hover-card-trigger"]');
    const event = new PointerEvent("pointerenter", {
      bubbles: true,
      cancelable: true,
      pointerType: "mouse",
    });
    trigger?.dispatchEvent(event);

    await vi.advanceTimersByTimeAsync(19);
    expect(onOpenChange).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(onOpenChange).toHaveBeenCalledOnce();
    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({
      event,
      isCanceled: true,
      reason: "trigger-hover",
      trigger,
    });
    expect(document.body.querySelector('[data-slot="hover-card-content"]')).toBeNull();
  });

  it("uses the active trigger close delay after the pointer leaves the content", async () => {
    vi.useFakeTimers();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <HoverCard>
          <HoverCardTrigger closeDelay={20} delay={1} href="/profile">
            Profile
          </HoverCardTrigger>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCard>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="hover-card-trigger"]');
    trigger?.dispatchEvent(
      new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }),
    );
    await vi.advanceTimersByTimeAsync(1);
    const content = document.body.querySelector<HTMLElement>('[data-slot="hover-card-content"]');

    trigger?.dispatchEvent(
      new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse" }),
    );
    content?.dispatchEvent(
      new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }),
    );
    content?.dispatchEvent(
      new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse" }),
    );

    await vi.advanceTimersByTimeAsync(19);
    expect(
      document.body.querySelector('[data-slot="hover-card-content"]')?.hasAttribute("data-open"),
    ).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(
      document.body.querySelector('[data-slot="hover-card-content"]')?.hasAttribute("data-closed"),
    ).toBe(true);
  });

  it("opens from focus and reports Escape dismissal without moving trigger focus", async () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <HoverCard onOpenChange={onOpenChange}>
          <HoverCardTrigger delay={1} href="/profile">
            Profile
          </HoverCardTrigger>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCard>
      ),
      host,
    );

    const trigger = host.querySelector<HTMLElement>('[data-slot="hover-card-trigger"]');
    trigger?.focus();
    await vi.advanceTimersByTimeAsync(1);

    expect(document.activeElement).toBe(trigger);
    expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ reason: "trigger-focus", trigger });

    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Escape",
    });
    trigger?.dispatchEvent(event);
    await Promise.resolve();

    expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ event, reason: "escape-key", trigger });
    expect(document.activeElement).toBe(trigger);
  });

  it("supports imperative close, retained unmounting, and completion callbacks", async () => {
    const actionsRef: {
      current: { close: () => void; unmount: () => void } | null;
    } = { current: null };
    const onOpenChange = vi.fn((open: boolean, details) => {
      if (!open) details.preventUnmountOnClose();
    });
    const onOpenChangeComplete = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(
      () => (
        <HoverCard
          actionsRef={actionsRef}
          defaultOpen
          onOpenChange={onOpenChange}
          onOpenChangeComplete={onOpenChangeComplete}
        >
          <HoverCardTrigger href="/profile">Profile</HoverCardTrigger>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCard>
      ),
      host,
    );

    const content = document.body.querySelector<HTMLElement>('[data-slot="hover-card-content"]');
    let finishAnimation: (() => void) | undefined;
    const finished = new Promise<void>((resolve) => {
      finishAnimation = resolve;
    });
    Object.defineProperty(content, "getAnimations", {
      value: () => [{ finished, playState: "running" }],
    });

    actionsRef.current?.close();
    await Promise.resolve();

    const retained = document.body.querySelector<HTMLElement>('[data-slot="hover-card-content"]');
    expect(onOpenChange.mock.lastCall?.[1]).toMatchObject({ reason: "imperative-action" });
    expect(retained?.hasAttribute("data-closed")).toBe(true);
    expect(retained?.hasAttribute("data-ending-style")).toBe(true);
    expect(retained?.parentElement?.inert).toBe(true);
    expect(onOpenChangeComplete).not.toHaveBeenCalled();

    finishAnimation?.();
    await finished;
    await Promise.resolve();
    expect(onOpenChangeComplete).not.toHaveBeenCalled();

    actionsRef.current?.unmount();
    retained?.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
    await Promise.resolve();
    expect(onOpenChangeComplete).toHaveBeenCalledOnce();
    expect(onOpenChangeComplete).toHaveBeenCalledWith(false);
    expect(document.body.querySelector('[data-slot="hover-card-content"]')).toBeNull();
  });
});
