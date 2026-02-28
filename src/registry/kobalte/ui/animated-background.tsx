import type { ComponentProps } from "solid-js";
import {
  createEffect,
  createSignal,
  mergeProps,
  on,
  onCleanup,
  onMount,
  splitProps,
} from "solid-js";
import { cn } from "@/lib/utils";

export type AnimatedBackgroundProps = ComponentProps<"div"> & {
  defaultValue?: string;
  onValueChange?: (newActiveId: string | null) => void;
  containerClass?: string;
  transition?: {
    duration?: number;
    easing?: string;
  };
  enableHover?: boolean;
};

export function AnimatedBackground(rawProps: AnimatedBackgroundProps) {
  const props = mergeProps(
    {
      enableHover: false,
      transition: { duration: 0.3, easing: "ease" },
    } as AnimatedBackgroundProps,
    rawProps,
  );
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "containerClass",
    "defaultValue",
    "onValueChange",
    "transition",
    "enableHover",
  ]);

  const [activeId, setActiveId] = createSignal<string | null>(local.defaultValue ?? null);

  let containerRef!: HTMLDivElement;
  let indicatorRef!: HTMLDivElement;

  const duration = () => local.transition?.duration ?? 0.3;
  const easing = () => local.transition?.easing ?? "ease";

  const handleSetActiveId = (id: string | null) => {
    setActiveId(id);
    local.onValueChange?.(id);
  };

  const updateIndicator = (currentId: string | null) => {
    if (!indicatorRef || !containerRef) return;

    if (!currentId) {
      indicatorRef.style.opacity = "0";
      return;
    }

    const targetEl = containerRef.querySelector<HTMLElement>(
      `[data-id="${CSS.escape(currentId)}"]`,
    );
    if (!targetEl) return;

    const containerRect = containerRef.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    indicatorRef.style.top = `${targetRect.top - containerRect.top}px`;
    indicatorRef.style.left = `${targetRect.left - containerRect.left}px`;
    indicatorRef.style.width = `${targetRect.width}px`;
    indicatorRef.style.height = `${targetRect.height}px`;
    indicatorRef.style.opacity = "1";
  };

  const attachListeners = () => {
    if (!containerRef) return;

    const items = containerRef.querySelectorAll<HTMLElement>("[data-id]");
    const cleanups: (() => void)[] = [];

    for (const item of items) {
      const id = item.getAttribute("data-id");
      if (!id) continue;

      item.style.position = "relative";
      item.style.zIndex = "1";

      if (local.enableHover) {
        const onEnter = () => handleSetActiveId(id);
        const onLeave = () => handleSetActiveId(null);
        item.addEventListener("mouseenter", onEnter);
        item.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          item.removeEventListener("mouseenter", onEnter);
          item.removeEventListener("mouseleave", onLeave);
        });
      } else {
        const handleClick = () => handleSetActiveId(id);
        item.addEventListener("click", handleClick);
        cleanups.push(() => {
          item.removeEventListener("click", handleClick);
        });
      }
    }

    return () => {
      for (const fn of cleanups) fn();
    };
  };

  createEffect(
    on(activeId, (currentId) => {
      if (!containerRef) return;

      const items = containerRef.querySelectorAll<HTMLElement>("[data-id]");
      for (const item of items) {
        const id = item.getAttribute("data-id");
        item.setAttribute("data-checked", id === currentId ? "true" : "false");
      }

      updateIndicator(currentId);
    }),
  );

  createEffect(
    on(
      () => local.defaultValue,
      (val) => {
        if (val !== undefined) {
          setActiveId(val);
        }
      },
    ),
  );

  onMount(() => {
    const cleanup = attachListeners();

    // Set initial position without animation
    if (indicatorRef) {
      indicatorRef.style.transition = "none";
    }
    updateIndicator(activeId());

    // Enable transitions after initial layout
    requestAnimationFrame(() => {
      if (indicatorRef) {
        const d = duration();
        const e = easing();
        indicatorRef.style.transition = [
          `top ${d}s ${e}`,
          `left ${d}s ${e}`,
          `width ${d}s ${e}`,
          `height ${d}s ${e}`,
          `opacity ${d}s ${e}`,
        ].join(", ");
      }
    });

    onCleanup(() => {
      cleanup?.();
    });
  });

  return (
    <div
      data-slot="animated-background"
      ref={containerRef}
      class={cn("relative", local.containerClass)}
      {...others}
    >
      <div
        data-slot="animated-background-indicator"
        ref={indicatorRef}
        class={cn("absolute", local.class)}
        style={{
          opacity: "0",
          "pointer-events": "none",
          "z-index": "0",
        }}
      />
      {local.children}
    </div>
  );
}
