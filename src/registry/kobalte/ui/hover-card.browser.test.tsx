// @vitest-environment happy-dom

import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("Hover Card browser behavior", () => {
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
    expect(content?.classList.contains("z-hover-card-content-logical")).toBe(true);
    expect(positioner?.classList.contains("isolate")).toBe(true);
    expect(positioner?.style.getPropertyValue("--transform-origin")).toBe(
      "var(--kb-popper-content-transform-origin)",
    );
    expect(positioner?.style.getPropertyValue("--available-height")).toBe(
      "var(--kb-popper-content-available-height)",
    );
    expect(positioner?.style.getPropertyValue("--anchor-width")).toBe(
      "var(--kb-popper-anchor-width)",
    );
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
    expect(onOpenChangeComplete).toHaveBeenCalledWith(false);

    actionsRef.current?.unmount();
    retained?.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
    await Promise.resolve();
    expect(document.body.querySelector('[data-slot="hover-card-content"]')).toBeNull();
  });
});
