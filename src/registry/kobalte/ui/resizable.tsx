import {
  type Size as CorvuSize,
  type DynamicProps,
  Handle,
  type HandleProps,
  Panel,
  type PanelChildrenProps,
  type PanelProps,
  Root,
  type RootChildrenProps,
  type RootProps,
} from "@corvu/resizable";
import {
  type Accessor,
  children,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  onMount,
  Show,
  splitProps,
  untrack,
  useContext,
} from "solid-js";

import { cn } from "@/lib/utils";

type Layout = Record<string, number>;
type PanelSize = {
  asPercentage: number;
  inPixels: number;
};

type ResizableGroupImperativeHandle = {
  getLayout: () => Layout;
  setLayout: (layout: Layout) => Layout;
};

type ResizablePanelImperativeHandle = {
  collapse: () => void;
  expand: () => void;
  getSize: () => PanelSize;
  isCollapsed: () => boolean;
  resize: (size: number | string) => void;
};

type PanelRegistration = {
  collapsedSize: Accessor<number | string | undefined>;
  collapsible: Accessor<boolean>;
  defaultSize: Accessor<number | string | undefined>;
  element: Accessor<HTMLElement | undefined>;
  id: string;
  maxSize: Accessor<number | string | undefined>;
  minSize: Accessor<number | string | undefined>;
};

type HandleAriaInformation = {
  controls: string | undefined;
  max: number | undefined;
  min: number | undefined;
  now: number | undefined;
};

type ResizablePanelGroupContextValue = {
  beginInteraction: () => void;
  collapsePanel: (id: string) => void;
  collapseThreshold: (id: string) => number;
  commitLayout: () => void;
  constraintVersion: Accessor<number>;
  disabled: Accessor<boolean>;
  expandPanel: (id: string) => void;
  getLayout: () => Layout;
  handleAria: (handle: HTMLElement | undefined) => HandleAriaInformation;
  isPanelCollapsed: (id: string) => boolean;
  orientation: Accessor<"horizontal" | "vertical">;
  registerPanel: (panel: PanelRegistration) => () => void;
  resetAtHandle: (handle: HTMLElement | undefined) => boolean;
  resizeAtHandle: (handle: HTMLElement | undefined, delta: number) => void;
  resizePanel: (id: string, size: number | string) => void;
  rootElement: Accessor<HTMLElement | undefined>;
  setLayout: (layout: Layout) => Layout;
  toggleAtHandle: (handle: HTMLElement | undefined) => void;
};

const ResizablePanelGroupContext = createContext<ResizablePanelGroupContextValue>();

function callEventHandler<T extends HTMLElement, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

function callRef<T>(ref: ((value: T) => void) | T | undefined, value: T) {
  if (typeof ref === "function") (ref as (value: T) => void)(value);
}

function serializeStyles(styles: JSX.CSSProperties) {
  return Object.entries(styles)
    .filter(([, value]) => value !== undefined)
    .map(([property, value]) => `${property}:${String(value)}`)
    .join(";");
}

function mergeLockedStyles(
  style: JSX.CSSProperties | string | undefined,
  lockedStyles: JSX.CSSProperties,
): JSX.CSSProperties | string {
  if (typeof style === "string") {
    const separator = style.trimEnd().endsWith(";") || style.length === 0 ? "" : ";";
    return `${style}${separator}${serializeStyles(lockedStyles)}`;
  }

  return { ...style, ...lockedStyles };
}

function mergeDefaultStyles(
  defaultStyles: JSX.CSSProperties,
  style: JSX.CSSProperties | string | undefined,
): JSX.CSSProperties | string {
  if (typeof style === "string") {
    const defaults = serializeStyles(defaultStyles);
    return `${defaults}${defaults.length > 0 && style.length > 0 ? ";" : ""}${style}`;
  }

  return { ...defaultStyles, ...style };
}

function toCorvuSize(
  size: number | string | undefined,
  element?: HTMLElement,
): CorvuSize | undefined {
  if (size === undefined) return undefined;
  if (typeof size === "number") return `${size}px`;

  const value = size.trim();
  if (value.endsWith("%")) return Number.parseFloat(value) / 100;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number.parseFloat(value) / 100;
  if (value.endsWith("px")) return value as CorvuSize;

  const unitMatch = value.match(/^(-?\d+(?:\.\d+)?)(em|rem|vh|vw)$/);
  if (unitMatch && typeof window !== "undefined") {
    const amount = Number.parseFloat(unitMatch[1] ?? "0");
    const unit = unitMatch[2];
    const body = element?.ownerDocument.body ?? document.body;
    const rootFontSize = Number.parseFloat(getComputedStyle(body).fontSize);
    const elementFontSize = element ? Number.parseFloat(getComputedStyle(element).fontSize) : 16;
    const unitSize =
      unit === "rem"
        ? rootFontSize
        : unit === "em"
          ? elementFontSize
          : unit === "vw"
            ? window.innerWidth / 100
            : window.innerHeight / 100;

    return `${amount * unitSize}px`;
  }

  // Corvu natively accepts percentages and pixels. Unknown CSS units retain the
  // primitive's explicit size error instead of leaking an invalid layout.
  return value as CorvuSize;
}

function toPanelSize(
  size: number,
  panel: HTMLElement | undefined,
  root: HTMLElement | undefined,
  orientation: "horizontal" | "vertical",
): PanelSize {
  const rootSize = root
    ? Array.from(root.children).reduce((total, child) => {
        if (!(child instanceof HTMLElement) || child.dataset.slot !== "resizable-panel") {
          return total;
        }
        return total + (orientation === "horizontal" ? child.offsetWidth : child.offsetHeight);
      }, 0)
    : 0;
  const panelPixels = orientation === "horizontal" ? panel?.offsetWidth : panel?.offsetHeight;
  const inPixels = panelPixels ?? size * rootSize;

  return {
    asPercentage: size * 100,
    inPixels,
  };
}

const RESIZE_KEYS = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Enter",
  "Home",
]);

type ResizablePanelGroupProps = Omit<
  DynamicProps<"div", RootProps<"div">>,
  | "as"
  | "children"
  | "contextId"
  | "handleCursorStyle"
  | "id"
  | "initialSizes"
  | "keyboardDelta"
  | "onSizesChange"
  | "orientation"
  | "ref"
  | "sizes"
  | "style"
> & {
  children?: JSX.Element;
  defaultLayout?: Layout;
  disableCursor?: boolean;
  disabled?: boolean;
  elementRef?: (element: HTMLElement | undefined) => void;
  groupRef?: (handle: ResizableGroupImperativeHandle | undefined) => void;
  id?: string | number;
  onLayoutChange?: (layout: Layout) => void;
  onLayoutChanged?: (layout: Layout) => void;
  orientation?: "horizontal" | "vertical";
  ref?: (element: HTMLElement) => void;
  resizeTargetMinimumSize?: { coarse: number; fine: number };
  style?: JSX.CSSProperties | string;
};

const ResizablePanelGroup = (props: ResizablePanelGroupProps) => {
  const [local, others] = splitProps(props as ResizablePanelGroupProps, [
    "children",
    "class",
    "defaultLayout",
    "disableCursor",
    "disabled",
    "elementRef",
    "groupRef",
    "id",
    "onDblClick",
    "onLayoutChange",
    "onLayoutChanged",
    "onPointerLeave",
    "onPointerMove",
    "onPointerDown",
    "orientation",
    "ref",
    "resizeTargetMinimumSize",
    "style",
  ]);
  const groupId = String(local.id ?? `resizable-group-${createUniqueId()}`);
  const [rootElement, setRootElement] = createSignal<HTMLElement>();
  const [currentSizes, setCurrentSizes] = createSignal<number[]>([]);
  const [constraintVersion, setConstraintVersion] = createSignal(0);
  const [edgeCursor, setEdgeCursor] = createSignal<string>();
  const [interacting, setInteracting] = createSignal(false);
  const [registrationVersion, setRegistrationVersion] = createSignal(0);
  const panels: PanelRegistration[] = [];
  const lastExpandedPanelSizes: Record<string, number> = {};
  const rememberedLayouts = new Map<string, Layout>();
  let rootApi: RootChildrenProps | undefined;
  let lastLayoutChange: Layout | undefined;
  let lastLayoutChanged: Layout | undefined;

  const orientation = () => local.orientation ?? "horizontal";
  const orderedPanels = () => {
    registrationVersion();

    return [...panels].sort((first, second) => {
      const firstElement = first.element();
      const secondElement = second.element();
      if (!firstElement || !secondElement || firstElement === secondElement) return 0;

      const position = firstElement.compareDocumentPosition(secondElement);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  };
  const panelGroupPixelSize = () =>
    orderedPanels().reduce((total, panel) => {
      const element = panel.element();
      return (
        total +
        (orientation() === "horizontal"
          ? (element?.offsetWidth ?? 0)
          : (element?.offsetHeight ?? 0))
      );
    }, 0);
  const sizePercentage = (
    size: number | string | undefined,
    fallback: number,
    element?: HTMLElement,
  ) => {
    if (size === undefined) return fallback;
    const resolved = toCorvuSize(size, element);
    if (typeof resolved === "number") return resolved * 100;
    if (resolved === undefined) return fallback;

    const pixels = Number.parseFloat(resolved);
    const groupPixels = panelGroupPixelSize();
    return groupPixels > 0 ? (pixels / groupPixels) * 100 : fallback;
  };
  const panelConstraints = (panel: PanelRegistration) => ({
    collapsedSize: sizePercentage(panel.collapsedSize(), 0, panel.element()),
    collapsible: panel.collapsible(),
    defaultSize:
      panel.defaultSize() === undefined
        ? undefined
        : sizePercentage(panel.defaultSize(), 0, panel.element()),
    maxSize: sizePercentage(panel.maxSize(), 100, panel.element()),
    minSize: sizePercentage(panel.minSize(), 0, panel.element()),
  });
  const constrainPanelSize = (size: number, panel: PanelRegistration) => {
    const constraints = panelConstraints(panel);
    let constrainedSize = size;
    if (constrainedSize < constraints.minSize) {
      if (constraints.collapsible) {
        const collapseThreshold = (constraints.collapsedSize + constraints.minSize) / 2;
        constrainedSize =
          constrainedSize < collapseThreshold ? constraints.collapsedSize : constraints.minSize;
      } else {
        constrainedSize = constraints.minSize;
      }
    }
    return Math.min(constraints.maxSize, constrainedSize);
  };
  const panelIndexAtHandle = (handle: HTMLElement | undefined) => {
    if (!handle) return -1;
    return (
      orderedPanels().filter((panel) => {
        const element = panel.element();
        return (
          !!element &&
          !!(element.compareDocumentPosition(handle) & Node.DOCUMENT_POSITION_FOLLOWING)
        );
      }).length - 1
    );
  };
  const panelIndexById = (id: string) => orderedPanels().findIndex((panel) => panel.id === id);
  const panelResizeStrategy = (panelIndex: number) =>
    panelIndex === orderedPanels().length - 1 ? "preceding" : "following";
  const panelCollapsedSize = (panel: PanelRegistration) =>
    sizePercentage(panel.collapsedSize(), 0, panel.element()) / 100;
  const isPanelCollapsed = (id: string) => {
    const panelIndex = panelIndexById(id);
    const panel = orderedPanels()[panelIndex];
    const size = (rootApi?.sizes ?? currentSizes())[panelIndex];
    return (
      !!panel &&
      panel.collapsible() &&
      size !== undefined &&
      Math.abs(size - panelCollapsedSize(panel)) <= 0.000_001
    );
  };
  const collapsePanel = (id: string) => {
    const panelIndex = panelIndexById(id);
    const panel = orderedPanels()[panelIndex];
    const size = (rootApi?.sizes ?? currentSizes())[panelIndex];
    if (!panel?.collapsible() || size === undefined || isPanelCollapsed(id)) return;
    lastExpandedPanelSizes[id] = size;
    rootApi?.collapse(panelIndex, panelResizeStrategy(panelIndex));
  };
  const resizePanel = (id: string, size: number | string) => {
    const panelIndex = panelIndexById(id);
    if (panelIndex < 0) return;
    rootApi?.resize(
      panelIndex,
      toCorvuSize(size, orderedPanels()[panelIndex]?.element()) ?? 0,
      panelResizeStrategy(panelIndex),
    );
  };
  const expandPanel = (id: string) => {
    if (!isPanelCollapsed(id)) return;
    const panelIndex = panelIndexById(id);
    const panel = orderedPanels()[panelIndex];
    if (!panel) return;
    const minimumSize = sizePercentage(panel.minSize(), 0, panel.element()) / 100;
    rootApi?.resize(
      panelIndex,
      lastExpandedPanelSizes[id] ?? (minimumSize === 0 ? 0.01 : minimumSize),
      panelResizeStrategy(panelIndex),
    );
  };
  const toggleAtHandle = (handle: HTMLElement | undefined) => {
    const panel = orderedPanels()[panelIndexAtHandle(handle)];
    if (!panel?.collapsible()) return;
    if (isPanelCollapsed(panel.id)) expandPanel(panel.id);
    else collapsePanel(panel.id);
  };
  const validateLayoutValues = (values: number[], ordered: PanelRegistration[]) => {
    const total = values.reduce((sum, size) => sum + size, 0);
    const normalized =
      total <= 0
        ? values.map(() => 100 / values.length)
        : values.map((size) => (total === 100 ? size : (100 / total) * size));
    let remaining = 0;
    const constrained = normalized.map((size, index) => {
      const nextSize = constrainPanelSize(size, ordered[index] as PanelRegistration);
      remaining += size - nextSize;
      return nextSize;
    });
    if (Math.abs(remaining) > 0.001) {
      for (let index = 0; index < constrained.length; index += 1) {
        const panel = ordered[index];
        const size = constrained[index];
        if (!panel || size === undefined) continue;
        const nextSize = constrainPanelSize(size + remaining, panel);
        if (nextSize !== size) {
          remaining -= nextSize - size;
          constrained[index] = nextSize;
          if (Math.abs(remaining) <= 0.001) break;
        }
      }
    }
    return constrained;
  };
  const initialSizes = () => {
    const ordered = orderedPanels();
    if (ordered.length === 0) return [];

    const rememberedLayout = rememberedLayouts.get(
      JSON.stringify(ordered.map((panel) => panel.id)),
    );
    if (rememberedLayout) {
      return validateLayoutValues(
        ordered.map((panel) => rememberedLayout[panel.id] ?? 0),
        ordered,
      ).map((size) => size / 100);
    }

    const defaultLayout = local.defaultLayout;
    if (defaultLayout && Object.keys(defaultLayout).length === ordered.length) {
      const values = ordered.map((panel) => defaultLayout[panel.id]);
      if (
        values.every((size) => size !== undefined && Number.isFinite(size) && size >= 0) &&
        values.reduce((total, size) => total + (size ?? 0), 0) > 0
      ) {
        return validateLayoutValues(
          values.map((size) => size ?? 0),
          ordered,
        ).map((size) => size / 100);
      }
    }

    const panelDefaults = ordered.map((panel) => panelConstraints(panel).defaultSize);
    const assignedTotal = panelDefaults.reduce<number>((total, size) => total + (size ?? 0), 0);
    const unassignedCount = panelDefaults.filter((size) => size === undefined).length;
    const unassignedSize = unassignedCount > 0 ? (100 - assignedTotal) / unassignedCount : 0;
    const values = panelDefaults.map((size) => size ?? unassignedSize);
    return validateLayoutValues(values, ordered).map((size) => size / 100);
  };
  const layoutFromSizes = (sizes: number[]) => {
    const layout: Layout = {};
    for (const [index, panel] of orderedPanels().entries()) {
      layout[panel.id] = (sizes[index] ?? 0) * 100;
    }
    return layout;
  };
  const getLayout = () => layoutFromSizes(rootApi?.sizes ?? currentSizes());
  const layoutsEqual = (first: Layout | undefined, second: Layout) => {
    if (!first) return false;
    const keys = Object.keys(second);
    return (
      keys.length === Object.keys(first).length && keys.every((key) => first[key] === second[key])
    );
  };
  const emitLayoutChange = (layout: Layout) => {
    if (layoutsEqual(lastLayoutChange, layout)) return;
    lastLayoutChange = { ...layout };
    local.onLayoutChange?.(layout);
  };
  const emitLayoutChanged = (layout: Layout) => {
    if (layoutsEqual(lastLayoutChanged, layout)) return;
    lastLayoutChanged = { ...layout };
    local.onLayoutChanged?.(layout);
  };
  const setLayout = (layout: Layout) => {
    const ordered = orderedPanels();
    const values = ordered.map((panel) => layout[panel.id]);
    if (
      Object.keys(layout).length !== ordered.length ||
      values.some((value) => value === undefined || !Number.isFinite(value) || value < 0)
    ) {
      throw new Error(
        `Invalid ${ordered.length} panel layout: ${Object.values(layout)
          .map((size) => `${size}%`)
          .join(", ")}`,
      );
    }

    const total = values.reduce((sum, size) => sum + (size ?? 0), 0);
    if (total <= 0) {
      throw new Error("Invalid panel layout: total size must be greater than 0%");
    }
    const constrained = validateLayoutValues(
      values.map((size) => size ?? 0),
      ordered,
    );

    const nextLayout = Object.fromEntries(
      ordered.map((panel, index) => [panel.id, constrained[index] ?? 0]),
    );
    rootApi?.setSizes(constrained.map((size) => size / 100));
    return nextLayout;
  };
  const resizeAtHandle = (handle: HTMLElement | undefined, delta: number) => {
    const panelIndex = panelIndexAtHandle(handle);
    const sizes = rootApi?.sizes ?? currentSizes();
    const panelSize = sizes[panelIndex];
    if (panelIndex < 0 || panelSize === undefined) return;
    rootApi?.resize(panelIndex, panelSize + delta, "following");
  };
  const resetAtIndex = (panelIndex: number) => {
    const ordered = orderedPanels();
    const preceding = ordered[panelIndex];
    const following = ordered[panelIndex + 1];
    const panel = preceding?.defaultSize() !== undefined ? preceding : following;
    if (!panel || panel.defaultSize() === undefined) return false;
    const index = ordered.indexOf(panel);
    rootApi?.resize(
      index,
      sizePercentage(panel.defaultSize(), 0, panel.element()) / 100,
      index === panelIndex ? "following" : "preceding",
    );
    return true;
  };
  const resetAtHandle = (handle: HTMLElement | undefined) =>
    resetAtIndex(panelIndexAtHandle(handle));
  const handleAria = (handle: HTMLElement | undefined): HandleAriaInformation => {
    const panelIndex = panelIndexAtHandle(handle);
    const ordered = orderedPanels();
    const preceding = ordered[panelIndex];
    const sizes = rootApi?.sizes ?? currentSizes();
    const precedingSize = sizes[panelIndex];
    if (!preceding || precedingSize === undefined || panelIndex >= ordered.length - 1) {
      return { controls: undefined, max: undefined, min: undefined, now: undefined };
    }
    const precedingConstraints = panelConstraints(preceding);
    const precedingMinimum = precedingConstraints.collapsible
      ? precedingConstraints.collapsedSize
      : precedingConstraints.minSize;
    let followingGrowthCapacity = 0;
    let followingShrinkCapacity = 0;
    for (let index = panelIndex + 1; index < ordered.length; index += 1) {
      const panel = ordered[index];
      const size = sizes[index];
      if (!panel || size === undefined) continue;
      const constraints = panelConstraints(panel);
      const minimum = constraints.collapsible ? constraints.collapsedSize : constraints.minSize;
      const sizePercentage = size * 100;
      followingGrowthCapacity += Math.max(0, constraints.maxSize - sizePercentage);
      followingShrinkCapacity += Math.max(0, sizePercentage - minimum);
    }
    const now = precedingSize * 100;

    return {
      controls: preceding.id,
      max: Math.min(precedingConstraints.maxSize, now + followingShrinkCapacity),
      min: Math.max(precedingMinimum, now - followingGrowthCapacity),
      now,
    };
  };
  const commitLayout = () => {
    setInteracting(false);
    if (orderedPanels().length !== currentSizes().length) return;
    emitLayoutChanged(layoutFromSizes(currentSizes()));
  };
  const registerPanel = (panel: PanelRegistration) => {
    panels.push(panel);
    setRegistrationVersion((version) => version + 1);

    return () => {
      const index = panels.indexOf(panel);
      if (index !== -1) panels.splice(index, 1);
      setRegistrationVersion((version) => version + 1);
    };
  };
  const context: ResizablePanelGroupContextValue = {
    beginInteraction: () => setInteracting(true),
    collapsePanel,
    collapseThreshold: (id) => {
      const panel = orderedPanels().find((candidate) => candidate.id === id);
      if (!panel) return 0;
      const constraints = panelConstraints(panel);
      return Math.max(0, (constraints.minSize - constraints.collapsedSize) / 200);
    },
    commitLayout,
    constraintVersion,
    disabled: () => local.disabled ?? false,
    expandPanel,
    getLayout,
    handleAria,
    isPanelCollapsed,
    orientation,
    registerPanel,
    resetAtHandle,
    resizeAtHandle,
    resizePanel,
    rootElement,
    setLayout,
    toggleAtHandle,
  };
  const groupHandle: ResizableGroupImperativeHandle = { getLayout, setLayout };
  let stopPointerResize: (() => void) | undefined;

  createEffect(() => {
    const element = rootElement();
    const ResizeObserver = element?.ownerDocument.defaultView?.ResizeObserver;
    if (!element || !ResizeObserver) return;
    let previousHeight = element.offsetHeight;
    let previousWidth = element.offsetWidth;
    const observer = new ResizeObserver(() => {
      const height = element.offsetHeight;
      const width = element.offsetWidth;
      if (height === previousHeight && width === previousWidth) return;
      previousHeight = height;
      previousWidth = width;

      const ordered = orderedPanels();
      const sizes = rootApi?.sizes ?? currentSizes();
      if (ordered.length === sizes.length) {
        const constrained = validateLayoutValues(
          sizes.map((size) => size * 100),
          ordered,
        ).map((size) => size / 100);
        if (constrained.some((size, index) => size !== sizes[index])) {
          rootApi?.setSizes(constrained);
        }
      }
      setConstraintVersion((version) => version + 1);
    });
    observer.observe(element);
    onCleanup(() => observer.disconnect());
  });

  createEffect(() => {
    const cursor = edgeCursor();
    const element = rootElement();
    if (!cursor || !element || local.disableCursor) return;
    const style = element.ownerDocument.createElement("style");
    style.dataset.resizableCursor = groupId;
    style.textContent = `*, *:hover { cursor: ${cursor} !important;${interacting() ? " touch-action: none;" : ""} }`;
    element.ownerDocument.head?.append(style);
    onCleanup(() => style.remove());
  });

  createEffect(() => {
    const groupRef = local.groupRef;
    groupRef?.(groupHandle);
    onCleanup(() => groupRef?.(undefined));
  });

  onCleanup(() => {
    stopPointerResize?.();
    local.elementRef?.(undefined);
  });

  const handleSizesChange = (sizes: number[]) => {
    const previousSizes = currentSizes();
    if (previousSizes.length === sizes.length) {
      for (const [index, panel] of orderedPanels().entries()) {
        const previousSize = previousSizes[index];
        const size = sizes[index];
        const collapsedSize = panelCollapsedSize(panel);
        if (
          panel.collapsible() &&
          previousSize !== undefined &&
          size !== undefined &&
          Math.abs(size - collapsedSize) <= 0.000_001 &&
          Math.abs(previousSize - collapsedSize) > 0.000_001
        ) {
          lastExpandedPanelSizes[panel.id] = previousSize;
        }
      }
    }
    setCurrentSizes(sizes);
    if (orderedPanels().length === sizes.length) {
      const layout = layoutFromSizes(sizes);
      rememberedLayouts.set(JSON.stringify(orderedPanels().map((panel) => panel.id)), {
        ...layout,
      });
      emitLayoutChange(layout);
      if (!interacting()) emitLayoutChanged(layout);
    }
  };
  const hitArea = () => local.resizeTargetMinimumSize ?? { coarse: 20, fine: 10 };
  const defaultEdgeCursor = () => (orientation() === "horizontal" ? "ew-resize" : "ns-resize");
  const blockedEdgeCursor = (delta: number) => {
    if (orientation() === "horizontal") return delta < 0 ? "e-resize" : "w-resize";
    return delta < 0 ? "s-resize" : "n-resize";
  };
  const isCoarsePointerEvent = (event: PointerEvent & { currentTarget: HTMLElement }) =>
    event.currentTarget.ownerDocument.defaultView?.matchMedia("(pointer: coarse)").matches ??
    event.pointerType === "touch";
  const findPanelBoundary = (clientX: number, clientY: number, coarse: boolean) => {
    const ordered = orderedPanels();
    const pointerPosition = orientation() === "horizontal" ? clientX : clientY;
    const minimumSize = coarse ? hitArea().coarse : hitArea().fine;
    let closest: { distance: number; index: number } | undefined;

    for (let index = 0; index < ordered.length - 1; index += 1) {
      const precedingRect = ordered[index]?.element()?.getBoundingClientRect();
      const followingRect = ordered[index + 1]?.element()?.getBoundingClientRect();
      if (!precedingRect || !followingRect) continue;
      const boundary =
        orientation() === "horizontal"
          ? (precedingRect.right + followingRect.left) / 2
          : (precedingRect.bottom + followingRect.top) / 2;
      const distance = Math.abs(pointerPosition - boundary);
      if (distance <= minimumSize / 2 && (!closest || distance < closest.distance)) {
        closest = { distance, index };
      }
    }

    return closest?.index;
  };
  const targetsThisGroup = (event: (PointerEvent | MouseEvent) & { currentTarget: HTMLElement }) =>
    !(event.target instanceof Element) ||
    event.target.closest('[data-slot="resizable-panel-group"]') === event.currentTarget;
  const handleRootPointerMove: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerMove as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (interacting()) return;
    if (
      local.disabled ||
      local.disableCursor ||
      !targetsThisGroup(event) ||
      (event.target instanceof Element && event.target.closest('[data-slot="resizable-handle"]'))
    ) {
      setEdgeCursor(undefined);
      return;
    }
    setEdgeCursor(
      findPanelBoundary(event.clientX, event.clientY, isCoarsePointerEvent(event)) === undefined
        ? undefined
        : defaultEdgeCursor(),
    );
  };
  const handleRootPointerLeave: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (!interacting()) setEdgeCursor(undefined);
  };
  const handlePointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (
      event.defaultPrevented ||
      local.disabled ||
      (event.pointerType === "mouse" && event.button > 0) ||
      !targetsThisGroup(event) ||
      (event.target instanceof Element && event.target.closest('[data-slot="resizable-handle"]'))
    ) {
      return;
    }

    const panelIndex = findPanelBoundary(event.clientX, event.clientY, isCoarsePointerEvent(event));
    const initialSizes = [...(rootApi?.sizes ?? currentSizes())];
    const initialSize = panelIndex === undefined ? undefined : initialSizes[panelIndex];
    const rootSize = panelGroupPixelSize();
    if (panelIndex === undefined || initialSize === undefined || !rootSize) return;

    const startPosition = orientation() === "horizontal" ? event.clientX : event.clientY;
    const pointerId = event.pointerId;
    const ownerWindow = event.currentTarget.ownerDocument.defaultView;
    if (!ownerWindow) return;
    event.preventDefault();
    setInteracting(true);
    if (!local.disableCursor) setEdgeCursor(defaultEdgeCursor());

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const position = orientation() === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
      const delta = (position - startPosition) / rootSize;
      const previousSize = (rootApi?.sizes ?? currentSizes())[panelIndex];
      rootApi?.resize(panelIndex, initialSize + delta, "following");
      const nextSize = (rootApi?.sizes ?? currentSizes())[panelIndex];
      if (!local.disableCursor) {
        setEdgeCursor(
          previousSize !== undefined && nextSize === previousSize && delta !== 0
            ? blockedEdgeCursor(delta)
            : defaultEdgeCursor(),
        );
      }
      moveEvent.preventDefault();
    };
    const finishPointerResize = (endEvent?: PointerEvent) => {
      if (endEvent && endEvent.pointerId !== pointerId) return;
      ownerWindow.removeEventListener("pointermove", handlePointerMove);
      ownerWindow.removeEventListener("pointerup", finishPointerResize);
      ownerWindow.removeEventListener("pointercancel", finishPointerResize);
      stopPointerResize = undefined;
      setEdgeCursor(undefined);
      commitLayout();
    };
    stopPointerResize?.();
    stopPointerResize = finishPointerResize;
    ownerWindow.addEventListener("pointermove", handlePointerMove, { passive: false });
    ownerWindow.addEventListener("pointerup", finishPointerResize);
    ownerWindow.addEventListener("pointercancel", finishPointerResize);
  };
  const handleDoubleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    callEventHandler(
      local.onDblClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || local.disabled || !targetsThisGroup(event)) return;
    if (event.target instanceof Element && event.target.closest('[data-slot="resizable-handle"]')) {
      return;
    }
    const panelIndex = findPanelBoundary(event.clientX, event.clientY, false);
    if (panelIndex !== undefined && resetAtIndex(panelIndex)) event.preventDefault();
  };
  const rootStyle = () =>
    mergeLockedStyles(
      mergeDefaultStyles(
        {
          height: "100%",
          width: "100%",
        },
        local.style,
      ),
      {
        "--resizable-handle-hit-area-coarse": `${hitArea().coarse}px`,
        "--resizable-handle-hit-area-fine": `${hitArea().fine}px`,
        display: "flex",
        "flex-direction": orientation() === "horizontal" ? "row" : "column",
        "flex-wrap": "nowrap",
        overflow: "hidden",
      } as JSX.CSSProperties,
    );

  return (
    <Root
      {...others}
      initialSizes={initialSizes()}
      keyboardDelta={0.05}
      handleCursorStyle={!local.disableCursor}
      onDblClick={handleDoubleClick}
      onPointerLeave={handleRootPointerLeave}
      onPointerMove={handleRootPointerMove}
      onPointerDown={handlePointerDown}
      onSizesChange={handleSizesChange}
      orientation={orientation()}
      ref={(element: HTMLElement) => {
        setRootElement(element);
        callRef(local.ref, element);
        local.elementRef?.(element);
      }}
      id={groupId}
      aria-orientation={orientation()}
      data-group=""
      data-testid={groupId}
      data-slot="resizable-panel-group"
      class={cn(
        "z-resizable-panel-group flex h-full w-full aria-[orientation=vertical]:flex-col",
        local.class,
      )}
      style={rootStyle()}
    >
      {(api) => {
        rootApi = api;

        return (
          <ResizablePanelGroupContext.Provider value={context}>
            {local.children}
          </ResizablePanelGroupContext.Provider>
        );
      }}
    </Root>
  );
};

type ResizablePanelProps = Omit<
  DynamicProps<"div", PanelProps<"div">>,
  | "as"
  | "children"
  | "collapseThreshold"
  | "collapsedSize"
  | "contextId"
  | "id"
  | "initialSize"
  | "maxSize"
  | "minSize"
  | "onCollapse"
  | "onExpand"
  | "onResize"
  | "panelId"
  | "ref"
  | "style"
> & {
  children?: JSX.Element;
  collapsedSize?: number | string;
  defaultSize?: number | string;
  elementRef?: (element: HTMLElement | undefined) => void;
  id?: string | number;
  maxSize?: number | string;
  minSize?: number | string;
  onResize?: (size: PanelSize, id: string | number | undefined, previousSize?: PanelSize) => void;
  panelRef?: (handle: ResizablePanelImperativeHandle | undefined) => void;
  ref?: (element: HTMLElement) => void;
  style?: JSX.CSSProperties | string;
};

const ResizablePanel = (props: ResizablePanelProps) => {
  const group = useContext(ResizablePanelGroupContext);
  const [local, others] = splitProps(props as ResizablePanelProps, [
    "children",
    "class",
    "collapsedSize",
    "collapsible",
    "defaultSize",
    "elementRef",
    "id",
    "maxSize",
    "minSize",
    "onResize",
    "panelRef",
    "ref",
    "style",
  ]);
  const panelId = String(local.id ?? `resizable-panel-${createUniqueId()}`);
  const [panelElement, setPanelElement] = createSignal<HTMLElement>();
  const [panelSize, setPanelSize] = createSignal(0);
  const resolvedChildren = children(() => local.children);
  let panelApi: PanelChildrenProps | undefined;
  let focusedElementToRestore: HTMLElement | undefined;
  let previousConfiguration: readonly (boolean | number | string | undefined)[] | undefined;
  let previousSize: PanelSize | undefined;

  const unregisterPanel = group?.registerPanel({
    collapsedSize: () => local.collapsedSize,
    collapsible: () => local.collapsible ?? false,
    defaultSize: () => local.defaultSize,
    element: panelElement,
    id: panelId,
    maxSize: () => local.maxSize,
    minSize: () => local.minSize,
  });
  onCleanup(() => {
    unregisterPanel?.();
    local.elementRef?.(undefined);
    local.panelRef?.(undefined);
  });

  const getSize = () =>
    toPanelSize(
      panelApi?.size ?? 0,
      panelElement(),
      group?.rootElement() ?? panelElement()?.parentElement ?? undefined,
      group?.orientation() ?? "horizontal",
    );
  const panelHandle: ResizablePanelImperativeHandle = {
    collapse: () => group?.collapsePanel(panelId),
    expand: () => group?.expandPanel(panelId),
    getSize,
    isCollapsed: () => group?.isPanelCollapsed(panelId) ?? panelApi?.collapsed ?? false,
    resize: (size) => group?.resizePanel(panelId, size),
  };
  // Corvu snapshots Panel constraints during registration. Recreate only that
  // primitive boundary when they change, while retaining the resolved consumer
  // subtree and restoring its focus after the replacement element mounts.
  const panelConfiguration = createMemo(() => {
    const configuration = [
      local.collapsedSize,
      local.collapsible,
      local.defaultSize,
      local.maxSize,
      local.minSize,
      group?.constraintVersion(),
    ] as const;
    const element = untrack(panelElement);
    if (
      previousConfiguration?.some((value, index) => value !== configuration[index]) &&
      element?.contains(element.ownerDocument.activeElement ?? null)
    ) {
      const activeElement = element?.ownerDocument.activeElement;
      if (activeElement instanceof HTMLElement) focusedElementToRestore = activeElement;
    }
    previousConfiguration = configuration;
    return configuration;
  });

  onMount(() => local.panelRef?.(panelHandle));

  const handleResize = (size: number) => setPanelSize(size);
  createEffect(() => {
    const element = panelElement();
    const onResize = local.onResize;
    const ResizeObserver = element?.ownerDocument.defaultView?.ResizeObserver;
    if (!element || !onResize || !ResizeObserver) return;

    const observer = new ResizeObserver(() => {
      const layoutPercentage = group?.getLayout()[panelId];
      const nextSize = toPanelSize(
        layoutPercentage === undefined ? panelSize() : layoutPercentage / 100,
        element,
        group?.rootElement() ?? element.parentElement ?? undefined,
        group?.orientation() ?? "horizontal",
      );
      if (
        previousSize?.asPercentage === nextSize.asPercentage &&
        previousSize.inPixels === nextSize.inPixels
      ) {
        return;
      }
      onResize(nextSize, local.id, previousSize);
      previousSize = nextSize;
    });
    observer.observe(element);
    onCleanup(() => observer.disconnect());
  });
  const panelStyle = mergeLockedStyles(undefined, {
    border: "none",
    "border-width": 0,
    display: "flex",
    height: "auto",
    "max-height": "100%",
    "max-width": "100%",
    "min-height": 0,
    "min-width": 0,
    overflow: "hidden",
    padding: 0,
    margin: 0,
    "flex-shrink": 1,
    width: "auto",
  });

  return (
    <Show keyed when={panelConfiguration()}>
      {(_configuration) => (
        <Panel
          {...others}
          minSize={toCorvuSize(local.minSize, panelElement())}
          maxSize={toCorvuSize(local.maxSize, panelElement())}
          collapsible={local.collapsible}
          collapsedSize={toCorvuSize(local.collapsedSize, panelElement())}
          collapseThreshold={group?.collapseThreshold(panelId)}
          onResize={handleResize}
          panelId={panelId}
          ref={(element: HTMLElement) => {
            setPanelElement(element);
            callRef(local.ref, element);
            local.elementRef?.(element);
            const focusedElement = focusedElementToRestore;
            if (focusedElement) {
              queueMicrotask(() => {
                if (focusedElement.isConnected) focusedElement.focus();
                if (focusedElementToRestore === focusedElement) {
                  focusedElementToRestore = undefined;
                }
              });
            }
          }}
          id={panelId}
          data-panel=""
          data-testid={panelId}
          data-slot="resizable-panel"
          style={panelStyle}
        >
          {(api) => {
            panelApi = api;

            return (
              <div
                class={local.class}
                style={mergeDefaultStyles(
                  {
                    "flex-grow": 1,
                    "max-height": "100%",
                    "max-width": "100%",
                  },
                  local.style,
                )}
              >
                {resolvedChildren()}
              </div>
            );
          }}
        </Panel>
      )}
    </Show>
  );
};

type ResizableHandleProps = Omit<
  DynamicProps<"div", HandleProps<"div">>,
  | "altKey"
  | "as"
  | "children"
  | "contextId"
  | "disabled"
  | "endIntersection"
  | "id"
  | "onHandleDrag"
  | "onHandleDragEnd"
  | "onHandleDragStart"
  | "ref"
  | "role"
  | "startIntersection"
  | "style"
  | "tabIndex"
> & {
  children?: JSX.Element;
  elementRef?: (element: HTMLElement | undefined) => void;
  id?: string | number;
  ref?: (element: HTMLElement) => void;
  style?: JSX.CSSProperties | string;
  withHandle?: boolean;
};

const ResizableHandle = (props: ResizableHandleProps) => {
  const group = useContext(ResizablePanelGroupContext);
  const [local, others] = splitProps(props as ResizableHandleProps, [
    "children",
    "class",
    "elementRef",
    "id",
    "onBlur",
    "onDblClick",
    "onKeyDown",
    "onKeyUp",
    "onMouseEnter",
    "onMouseLeave",
    "onPointerDown",
    "ref",
    "style",
    "withHandle",
  ]);
  const handleId = String(local.id ?? `resizable-handle-${createUniqueId()}`);
  const [handleElement, setHandleElement] = createSignal<HTMLElement>();
  const [separatorState, setSeparatorState] = createSignal<"active" | "hover" | "inactive">(
    "inactive",
  );
  const disabled = () => group?.disabled() ?? false;
  const ariaOrientation = () =>
    (group?.orientation() ?? "horizontal") === "horizontal" ? "vertical" : "horizontal";
  const ariaInformation = () => group?.handleAria(handleElement());

  onCleanup(() => local.elementRef?.(undefined));

  const handleBlur: JSX.EventHandler<HTMLElement, FocusEvent> = (event) => {
    callEventHandler(
      local.onBlur as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
      event,
    );
  };
  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (disabled()) {
      // Corvu does not gate its internal keyboard handler on `disabled`, so
      // cancel only the keys it would consume; Tab and F6 retain native focus behavior.
      if (RESIZE_KEYS.has(event.key)) event.preventDefault();
      return;
    }
    if (event.defaultPrevented) return;
    if (event.key === "F6") {
      const handles = Array.from(
        group
          ?.rootElement()
          ?.querySelectorAll<HTMLElement>(':scope > [data-slot="resizable-handle"]') ?? [],
      );
      const index = handles.indexOf(event.currentTarget);
      const nextIndex = event.shiftKey
        ? index > 0
          ? index - 1
          : handles.length - 1
        : index + 1 < handles.length
          ? index + 1
          : 0;
      handles[nextIndex]?.focus();
      event.preventDefault();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      group?.toggleAtHandle(handleElement());
      return;
    }

    const orientation = group?.orientation() ?? "horizontal";
    const delta =
      event.key === "Home"
        ? -1
        : event.key === "End"
          ? 1
          : (orientation === "horizontal" && event.key === "ArrowLeft") ||
              (orientation === "vertical" && event.key === "ArrowUp")
            ? -0.05
            : (orientation === "horizontal" && event.key === "ArrowRight") ||
                (orientation === "vertical" && event.key === "ArrowDown")
              ? 0.05
              : undefined;
    if (delta !== undefined || event.key.startsWith("Arrow")) {
      event.preventDefault();
      if (delta !== undefined) group?.resizeAtHandle(handleElement(), delta);
    }
  };
  const handleKeyUp: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyUp as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
  };
  const handlePointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    callEventHandler(
      local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
      event,
    );
    if (disabled()) return;
    if (event.pointerType === "mouse" && event.button > 0) {
      event.preventDefault();
    } else if (!event.defaultPrevented) {
      event.currentTarget.focus();
    }
  };
  const handleDoubleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    callEventHandler(
      local.onDblClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    if (!event.defaultPrevented && !disabled() && group?.resetAtHandle(handleElement())) {
      event.preventDefault();
    }
  };
  const handleMouseEnter: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    callEventHandler(
      local.onMouseEnter as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    if (!disabled() && separatorState() !== "active") setSeparatorState("hover");
  };
  const handleMouseLeave: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    callEventHandler(
      local.onMouseLeave as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    if (separatorState() !== "active") setSeparatorState("inactive");
  };
  const handleDragStart = (event: PointerEvent) => {
    if (event.defaultPrevented || disabled()) return;
    setSeparatorState("active");
    group?.beginInteraction();
  };
  const handleDragEnd = () => {
    setSeparatorState(handleElement()?.matches(":hover") ? "hover" : "inactive");
    group?.commitLayout();
  };

  return (
    <Handle
      {...others}
      altKey={false}
      as="div"
      disabled={disabled()}
      onBlur={handleBlur}
      onDblClick={handleDoubleClick}
      onHandleDragStart={handleDragStart}
      onHandleDragEnd={handleDragEnd}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      ref={(element: HTMLElement) => {
        setHandleElement(element);
        callRef(local.ref, element);
        local.elementRef?.(element);
      }}
      id={handleId}
      aria-controls={ariaInformation()?.controls}
      aria-valuemax={ariaInformation()?.max}
      aria-valuemin={ariaInformation()?.min}
      aria-valuenow={ariaInformation()?.now}
      aria-orientation={ariaOrientation()}
      role="separator"
      data-separator={separatorState()}
      data-testid={handleId}
      data-slot="resizable-handle"
      tabIndex={0}
      class={cn(
        "z-resizable-handle relative flex w-px items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:left-1/2 after:w-(--resizable-handle-hit-area-fine) after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-(--resizable-handle-hit-area-fine) data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:translate-x-0 data-[orientation=vertical]:after:-translate-y-1/2 [@media(pointer:coarse)]:after:w-(--resizable-handle-hit-area-coarse) [@media(pointer:coarse)]:data-[orientation=vertical]:after:h-(--resizable-handle-hit-area-coarse) [&[data-orientation=vertical]>[data-slot=resizable-handle-icon]]:rotate-90",
        local.class,
      )}
      style={mergeLockedStyles(mergeDefaultStyles({ "flex-basis": "auto" }, local.style), {
        "flex-grow": 0,
        "flex-shrink": 0,
      })}
    >
      <Show when={local.withHandle}>
        <div data-slot="resizable-handle-icon" class="z-resizable-handle-icon z-10 flex shrink-0" />
      </Show>
    </Handle>
  );
};

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
