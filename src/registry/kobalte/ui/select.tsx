import * as PopperPrimitive from "@kobalte/core/popper";
import { Check, ChevronDown, ChevronUp } from "lucide-solid";
import type { Accessor, ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  mergeProps,
  onCleanup,
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { Dynamic, Portal } from "solid-js/web";

import { cn } from "@/lib/utils";

type SelectAlign = "center" | "end" | "start";
type SelectPhysicalSide = "bottom" | "left" | "right" | "top";
type SelectSide = SelectPhysicalSide | "inline-end" | "inline-start";
type SelectInteractionType = "keyboard" | "mouse" | "pen" | "touch";
type SelectValue = unknown;

type SelectFinalFocus =
  | boolean
  | { readonly current: HTMLElement | null }
  | ((closeType: SelectInteractionType) => boolean | HTMLElement | null | undefined);

type SelectChangeReason =
  | "cancel-open"
  | "escape-key"
  | "focus-out"
  | "item-press"
  | "list-navigation"
  | "none"
  | "outside-press"
  | "trigger-press"
  | "window-resize";

type SelectChangeDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  readonly event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  readonly reason: SelectChangeReason;
  readonly trigger: Element | undefined;
};

type SelectActions = {
  unmount: () => void;
};

type SelectItemDefinition<Value> = {
  disabled?: boolean;
  label: JSX.Element;
  value: Value;
};

type SelectItemGroup<Value> = {
  items: ReadonlyArray<SelectItemDefinition<Value>>;
  label?: JSX.Element;
};

type SelectItems<Value> =
  | Record<string, JSX.Element>
  | ReadonlyArray<SelectItemDefinition<Value> | SelectItemGroup<Value>>;

type SelectPosition = {
  align: SelectAlign;
  alignItemWithTrigger: boolean;
  alignOffset: number;
  side: SelectSide;
  sideOffset: number;
};

type RegisteredSelectItem = {
  disabled: Accessor<boolean>;
  element: Accessor<HTMLElement | undefined>;
  label: Accessor<string>;
  value: Accessor<SelectValue>;
};

type SelectContextValue = {
  canScrollDown: Accessor<boolean>;
  canScrollUp: Accessor<boolean>;
  currentPlacement: Accessor<string>;
  disabled: Accessor<boolean>;
  handleItemKeyDown: (item: RegisteredSelectItem, event: KeyboardEvent) => void;
  hasSelectedValue: Accessor<boolean>;
  highlightItem: (item: RegisteredSelectItem) => void;
  highlightItemOnHover: Accessor<boolean>;
  highlightedItem: Accessor<RegisteredSelectItem | undefined>;
  inputType: Accessor<SelectInteractionType>;
  isOpen: Accessor<boolean>;
  isReadOnly: Accessor<boolean>;
  isSelected: (itemValue: SelectValue) => boolean;
  listId: string;
  multiple: Accessor<boolean>;
  present: Accessor<boolean>;
  required: Accessor<boolean>;
  registerItem: (item: RegisteredSelectItem) => () => void;
  requestOpen: (
    open: boolean,
    reason: SelectChangeReason,
    event?: Event,
    trigger?: Element,
    focus?: "first" | "last" | "selected",
    restoreFocus?: boolean,
  ) => SelectChangeDetails | undefined;
  selectItem: (item: RegisteredSelectItem, event: Event) => void;
  selectedLabel: Accessor<JSX.Element>;
  selectedValue: Accessor<SelectValue | SelectValue[]>;
  setContent: (element: HTMLElement | undefined) => void;
  setCurrentPlacement: (placement: string) => void;
  setFinalFocus: (finalFocus: SelectFinalFocus | undefined) => void;
  setInputType: (inputType: SelectInteractionType) => void;
  setPosition: (position: SelectPosition) => void;
  setTrigger: (element: HTMLElement | undefined) => void;
  startScrolling: (direction: -1 | 1) => void;
  stopScrolling: () => void;
  trigger: Accessor<HTMLElement | undefined>;
  triggerId: Accessor<string>;
  typeahead: (event: KeyboardEvent) => void;
  updateScrollState: () => void;
};

type SelectGroupContextValue = {
  labelId: Accessor<string | undefined>;
  setLabelId: (id: string | undefined) => void;
};

const SelectContext = createContext<SelectContextValue>();
const SelectGroupContext = createContext<SelectGroupContextValue>();

function useSelectContext() {
  const context = useContext(SelectContext);
  if (!context) throw new Error("Select parts must be used within Select");
  return context;
}

function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

function setElementRef(ref: unknown, element: HTMLElement) {
  if (typeof ref === "function") (ref as (element: HTMLElement) => void)(element);
}

function createChangeDetails(
  reason: SelectChangeReason,
  event?: Event,
  trigger?: Element,
): SelectChangeDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    allowPropagation: () => {
      propagationAllowed = true;
    },
    cancel: () => {
      canceled = true;
    },
    event: event ?? new Event("base-ui"),
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    reason,
    trigger,
  };
}

function serializeValue(value: SelectValue) {
  if (value == null) return "";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function stringifyLabel(value: SelectValue, itemToStringLabel?: (value: SelectValue) => string) {
  if (itemToStringLabel && value != null) return itemToStringLabel(value) ?? "";
  if (value && typeof value === "object") {
    if ("label" in value && value.label != null) return String(value.label);
    if ("value" in value) return String(value.value);
  }
  return serializeValue(value);
}

function stringifyValue(value: SelectValue, itemToStringValue?: (value: SelectValue) => string) {
  if (itemToStringValue && value != null) return itemToStringValue(value) ?? "";
  if (value && typeof value === "object" && "label" in value && "value" in value) {
    return serializeValue(value.value);
  }
  return serializeValue(value);
}

function flattenItems(items: SelectItems<SelectValue> | undefined) {
  if (!items) return [];
  if (!Array.isArray(items)) {
    return Object.entries(items).map(([value, label]) => ({ disabled: false, label, value }));
  }

  const itemDefinitions = items as ReadonlyArray<
    SelectItemDefinition<SelectValue> | SelectItemGroup<SelectValue>
  >;
  return itemDefinitions.flatMap((item) => ("items" in item ? item.items : [item]));
}

function labelText(label: JSX.Element) {
  return typeof label === "string" || typeof label === "number" ? String(label) : "";
}

function interactionTypeForEvent(
  event: Event | undefined,
  fallback: SelectInteractionType,
): SelectInteractionType {
  if (!event) return fallback;
  if (event.type.startsWith("key")) return "keyboard";
  if ("pointerType" in event) {
    const pointerType = String(event.pointerType);
    return pointerType === "pen" || pointerType === "touch" ? pointerType : "mouse";
  }
  if (event.type === "click" || event.type.startsWith("mouse")) return "mouse";
  return fallback;
}

function physicalSide(side: SelectSide): SelectPhysicalSide {
  if (side === "inline-start") return "left";
  if (side === "inline-end") return "right";
  return side;
}

function selectPlacement(position: SelectPosition) {
  const side = physicalSide(position.side);
  return position.align === "center" ? side : (`${side}-${position.align}` as const);
}

function placementParts(placement: string) {
  const [side, align = "center"] = placement.split("-");
  return { align, side };
}

function mergeStyles(
  internal: JSX.CSSProperties,
  external: JSX.CSSProperties | string | undefined,
) {
  if (typeof external !== "string") return { ...internal, ...external };

  const serialized = Object.entries(internal)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([property, value]) => `${property}:${value}`)
    .join(";");

  return `${serialized};${external}`;
}

type SelectValueType<Value, Multiple extends boolean | undefined> = Multiple extends true
  ? Value[]
  : Value;

type SelectProps<Value, Multiple extends boolean | undefined = false> = {
  actionsRef?: { current: SelectActions | null };
  autoComplete?: string;
  children?: JSX.Element;
  defaultOpen?: boolean;
  defaultValue?: SelectValueType<Value, Multiple> | null;
  disabled?: boolean;
  form?: string;
  highlightItemOnHover?: boolean;
  id?: string;
  inputRef?: (element: HTMLInputElement | undefined) => void;
  isItemEqualToValue?: (itemValue: Value, value: Value) => boolean;
  items?: SelectItems<Value>;
  itemToStringLabel?: (itemValue: Value) => string;
  itemToStringValue?: (itemValue: Value) => string;
  modal?: boolean;
  multiple?: Multiple;
  name?: string;
  onOpenChange?: (open: boolean, details: SelectChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  onValueChange?: (
    value: SelectValueType<Value, Multiple> | (Multiple extends true ? never : null),
    details: SelectChangeDetails,
  ) => void;
  open?: boolean;
  readOnly?: boolean;
  required?: boolean;
  value?: SelectValueType<Value, Multiple> | null;
};

const Select = <Value, Multiple extends boolean | undefined = false>(
  props: SelectProps<Value, Multiple>,
) => {
  // Kobalte Select requires an `options` collection and `itemComponent`, so it cannot preserve
  // shadcn's compositional `<SelectItem value>` API. Kobalte Popper still provides positioning.
  const mergedProps = mergeProps(
    {
      defaultOpen: false,
      disabled: false,
      highlightItemOnHover: true,
      modal: true,
      readOnly: false,
      required: false,
    },
    props,
  );
  const rootId = mergedProps.id ?? `select-${createUniqueId()}`;
  const listId = `${rootId}-list`;
  const initialValue = mergedProps.multiple
    ? (mergedProps.defaultValue ?? [])
    : (mergedProps.defaultValue ?? null);
  const [uncontrolledValue, setUncontrolledValue] = createSignal<SelectValue | SelectValue[]>(
    initialValue as SelectValue | SelectValue[],
  );
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(mergedProps.defaultOpen);
  const [present, setPresent] = createSignal(mergedProps.open ?? mergedProps.defaultOpen);
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const [content, setContent] = createSignal<HTMLElement>();
  const [hiddenInput, setHiddenInput] = createSignal<HTMLInputElement>();
  const [highlightedItem, setHighlightedItem] = createSignal<RegisteredSelectItem>();
  const [registeredRevision, setRegisteredRevision] = createSignal(0);
  const [currentPlacement, setCurrentPlacement] = createSignal("bottom");
  const [inputType, setInputType] = createSignal<SelectInteractionType>("keyboard");
  const [canScrollUp, setCanScrollUp] = createSignal(false);
  const [canScrollDown, setCanScrollDown] = createSignal(false);
  const [position, setPosition] = createSignal<SelectPosition>({
    align: "center",
    alignItemWithTrigger: true,
    alignOffset: 0,
    side: "bottom",
    sideOffset: 4,
  });
  const registeredItems = new Set<RegisteredSelectItem>();
  const cachedItemLabels: Array<{ label: string; value: SelectValue }> = [];
  const selectedValue = (): SelectValue | SelectValue[] =>
    mergedProps.value !== undefined
      ? (mergedProps.value as SelectValue | SelectValue[])
      : uncontrolledValue();
  const isOpen = () => mergedProps.open ?? uncontrolledOpen();
  const multiple = () => mergedProps.multiple ?? false;
  const isEqual = (itemValue: SelectValue, value: SelectValue) =>
    mergedProps.isItemEqualToValue
      ? mergedProps.isItemEqualToValue(itemValue as Value, value as Value)
      : Object.is(itemValue, value);
  const orderedItems = () => {
    registeredRevision();
    return [...registeredItems]
      .filter((item) => item.element()?.isConnected)
      .sort((first, second) => {
        const firstElement = first.element();
        const secondElement = second.element();
        if (!firstElement || !secondElement || firstElement === secondElement) return 0;
        const relation = firstElement.compareDocumentPosition(secondElement);
        if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
  };
  const enabledItems = () => orderedItems().filter((item) => !item.disabled());
  const isSelected = (itemValue: SelectValue) => {
    const currentValue = selectedValue();
    if (multiple()) {
      return Array.isArray(currentValue) && currentValue.some((value) => isEqual(itemValue, value));
    }
    return !Array.isArray(currentValue) && isEqual(itemValue, currentValue);
  };
  const serialize = (value: SelectValue) =>
    stringifyValue(
      value,
      mergedProps.itemToStringValue as ((value: SelectValue) => string) | undefined,
    );
  const hasSelectedValue = () => {
    const currentValue = selectedValue();
    return multiple()
      ? Array.isArray(currentValue) && currentValue.length > 0
      : !Array.isArray(currentValue) && currentValue != null && serialize(currentValue) !== "";
  };
  const definitions = () => flattenItems(mergedProps.items as SelectItems<SelectValue> | undefined);
  const resolveLabel = (value: SelectValue): JSX.Element => {
    if (mergedProps.itemToStringLabel && value != null) {
      return mergedProps.itemToStringLabel(value as Value);
    }
    if (value && typeof value === "object" && "label" in value && value.label != null) {
      return value.label as JSX.Element;
    }

    const item = definitions().find((candidate) => isEqual(candidate.value, value));
    if (item?.label != null) return item.label;
    registeredRevision();
    const registeredItem = [...registeredItems].find((candidate) =>
      isEqual(candidate.value(), value),
    );
    if (registeredItem) return registeredItem.label();
    const cachedItem = cachedItemLabels.find((candidate) => isEqual(candidate.value, value));
    if (cachedItem) return cachedItem.label;
    return stringifyLabel(value);
  };
  const selectedLabel = (): JSX.Element => {
    const currentValue = selectedValue();
    if (!multiple()) return resolveLabel(currentValue);
    if (!Array.isArray(currentValue)) return "";
    return currentValue.flatMap((value, index) =>
      index === 0 ? [resolveLabel(value)] : [", ", resolveLabel(value)],
    );
  };
  const positioningAnchorRect = (anchor?: HTMLElement) => {
    const anchorRect = anchor?.getBoundingClientRect();
    const side = physicalSide(position().side);
    if (
      !anchorRect ||
      !isOpen() ||
      !position().alignItemWithTrigger ||
      inputType() !== "mouse" ||
      (side !== "bottom" && side !== "top")
    ) {
      return anchorRect;
    }

    const popup = content();
    const selectedItem = enabledItems()
      .find((item) => isSelected(item.value()))
      ?.element();
    if (!popup || !selectedItem) return anchorRect;

    const popupRect = popup.getBoundingClientRect();
    const itemRect = selectedItem.getBoundingClientRect();
    const itemCenter = itemRect.top - popupRect.top + itemRect.height / 2;
    const popupTop = anchorRect.top + anchorRect.height / 2 - itemCenter;
    const y =
      side === "bottom"
        ? popupTop - position().sideOffset
        : popupTop + popupRect.height + position().sideOffset;

    return { height: 0, width: anchorRect.width, x: anchorRect.x, y };
  };
  const updateScrollState = () => {
    const element = content();
    if (!element) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }
    setCanScrollUp(element.scrollTop > 1);
    setCanScrollDown(element.scrollTop + element.clientHeight < element.scrollHeight - 1);
  };
  const highlightItem = (item: RegisteredSelectItem) => {
    if (!item.disabled()) setHighlightedItem(item);
  };
  const focusItem = (item: RegisteredSelectItem | undefined) => {
    const element = item?.element();
    if (!item || !element || item.disabled()) return;
    highlightItem(item);
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "nearest" });
    updateScrollState();
  };
  const focusInitialItem = (strategy: "first" | "last" | "selected" = "selected") => {
    const items = enabledItems();
    if (items.length === 0) return;
    const selected = items.find((item) => isSelected(item.value()));
    focusItem(
      strategy === "first" ? items[0] : strategy === "last" ? items.at(-1) : (selected ?? items[0]),
    );
  };
  let pendingFocus: "first" | "last" | "selected" = "selected";
  let scrollTimer: ReturnType<typeof setInterval> | undefined;
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;
  let typeaheadBuffer = "";
  let pendingCloseFocus: boolean | undefined;
  let pendingCloseType: SelectInteractionType | undefined;
  let previousOpen = isOpen();
  let completeVersion = 0;
  const [finalFocus, setFinalFocusState] = createSignal<SelectFinalFocus>();
  const setFinalFocus = (nextFinalFocus: SelectFinalFocus | undefined) => {
    setFinalFocusState(() => nextFinalFocus);
  };
  const restoreFinalFocus = (closeType: SelectInteractionType) => {
    const configuredFocus = finalFocus();
    const resolvedFocus =
      typeof configuredFocus === "function" ? configuredFocus(closeType) : configuredFocus;
    if (resolvedFocus === false || resolvedFocus == null) {
      if (configuredFocus !== undefined) return;
    }
    const element =
      resolvedFocus === true || resolvedFocus == null
        ? trigger()
        : resolvedFocus instanceof HTMLElement
          ? resolvedFocus
          : typeof resolvedFocus === "object"
            ? resolvedFocus.current
            : undefined;
    queueMicrotask(() => element?.focus());
  };

  const requestOpen: SelectContextValue["requestOpen"] = (
    nextOpen,
    reason,
    event,
    changeTrigger,
    focus = "selected",
    restoreFocus = true,
  ) => {
    if ((nextOpen && mergedProps.disabled) || nextOpen === isOpen()) return;
    const details = createChangeDetails(reason, event, changeTrigger);
    mergedProps.onOpenChange?.(nextOpen, details);
    if (details.isCanceled) return details;

    pendingFocus = focus;
    if (mergedProps.open === undefined) setUncontrolledOpen(nextOpen);
    if (!nextOpen) {
      clearInterval(scrollTimer);
      scrollTimer = undefined;
      pendingCloseFocus = restoreFocus;
      pendingCloseType = interactionTypeForEvent(event, inputType());
    }
    return details;
  };

  const setValue = (
    nextValue: SelectValue | SelectValue[],
    reason: SelectChangeReason,
    event: Event,
    changeTrigger?: Element,
  ) => {
    const details = createChangeDetails(reason, event, changeTrigger);
    mergedProps.onValueChange?.(nextValue as never, details);
    if (details.isCanceled) return false;
    if (mergedProps.value === undefined) setUncontrolledValue(nextValue);
    return true;
  };

  const selectItem = (item: RegisteredSelectItem, event: Event) => {
    if (mergedProps.disabled || mergedProps.readOnly || item.disabled()) return;
    cacheItemLabel(item);
    const itemValue = item.value();
    if (multiple()) {
      const currentValue = selectedValue();
      const values = Array.isArray(currentValue) ? currentValue : [];
      const nextValue = isSelected(itemValue)
        ? values.filter((value) => !isEqual(itemValue, value))
        : [...values, itemValue];
      setValue(nextValue, "item-press", event, item.element());
      return;
    }

    if (!isSelected(itemValue)) setValue(itemValue, "item-press", event, item.element());
    requestOpen(false, "item-press", event, item.element());
  };

  const moveHighlight = (direction: -1 | 1 | "first" | "last") => {
    const items = enabledItems();
    if (items.length === 0) return;
    if (direction === "first") {
      focusItem(items[0]);
      return;
    }
    if (direction === "last") {
      focusItem(items.at(-1));
      return;
    }

    const currentItem = highlightedItem();
    const index = currentItem ? items.indexOf(currentItem) : -1;
    const nextIndex = index === -1 ? (direction === 1 ? 0 : items.length - 1) : index + direction;
    focusItem(items[Math.max(0, Math.min(items.length - 1, nextIndex))]);
  };

  const typeahead = (event: KeyboardEvent) => {
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    clearTimeout(typeaheadTimer);
    const key = event.key.toLocaleLowerCase();
    typeaheadBuffer = typeaheadBuffer === key ? key : `${typeaheadBuffer}${key}`;
    typeaheadTimer = setTimeout(() => {
      typeaheadBuffer = "";
    }, 500);

    const registered = enabledItems();
    if (isOpen() && registered.length > 0) {
      const currentItem = highlightedItem();
      const start = Math.max(0, (currentItem ? registered.indexOf(currentItem) : -1) + 1);
      const candidates = [...registered.slice(start), ...registered.slice(0, start)];
      const match = candidates.find((item) =>
        item.label().toLocaleLowerCase().startsWith(typeaheadBuffer),
      );
      if (match) {
        event.preventDefault();
        focusItem(match);
      }
      return;
    }

    if (multiple()) return;
    const available = definitions().filter((item) => !item.disabled);
    const currentIndex = available.findIndex((item) => isSelected(item.value));
    const candidates = [
      ...available.slice(Math.max(0, currentIndex + 1)),
      ...available.slice(0, Math.max(0, currentIndex + 1)),
    ];
    const match = candidates.find((item) =>
      labelText(item.label).toLocaleLowerCase().startsWith(typeaheadBuffer),
    );
    if (match) {
      event.preventDefault();
      setValue(match.value, "list-navigation", event, trigger());
    }
  };

  const handleItemKeyDown = (item: RegisteredSelectItem, event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    setInputType("keyboard");
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (["End", "Home", "PageDown", "PageUp"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      moveHighlight(event.key === "End" || event.key === "PageDown" ? "last" : "first");
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      selectItem(item, event);
      return;
    }
    if (event.key === "Tab") {
      requestOpen(false, "focus-out", event, item.element(), "selected", false);
      return;
    }
    typeahead(event);
  };

  const registerItem = (item: RegisteredSelectItem) => {
    registeredItems.add(item);
    setRegisteredRevision((revision) => revision + 1);
    queueMicrotask(() => cacheItemLabel(item));
    return () => {
      registeredItems.delete(item);
      setRegisteredRevision((revision) => revision + 1);
      if (highlightedItem() === item) setHighlightedItem(undefined);
    };
  };

  function cacheItemLabel(item: RegisteredSelectItem) {
    const value = item.value();
    const label = item.label();
    const cachedItem = cachedItemLabels.find((candidate) => isEqual(candidate.value, value));
    if (cachedItem) cachedItem.label = label;
    else cachedItemLabels.push({ label, value });
    setRegisteredRevision((revision) => revision + 1);
  }

  const startScrolling = (direction: -1 | 1) => {
    clearInterval(scrollTimer);
    scrollTimer = setInterval(() => {
      const element = content();
      if (!element) return;
      element.scrollTop += direction * 4;
      updateScrollState();
    }, 16);
  };
  const stopScrolling = () => {
    clearInterval(scrollTimer);
    scrollTimer = undefined;
  };

  createEffect(() => {
    const nextOpen = isOpen();
    if (nextOpen === previousOpen) return;
    previousOpen = nextOpen;
    const version = ++completeVersion;
    if (nextOpen) {
      setPresent(true);
      queueMicrotask(() => queueMicrotask(() => focusInitialItem(pendingFocus)));
    } else {
      setHighlightedItem(undefined);
      const shouldRestoreFocus = pendingCloseFocus ?? true;
      const closeType = pendingCloseType ?? inputType();
      pendingCloseFocus = undefined;
      pendingCloseType = undefined;
      if (shouldRestoreFocus) restoreFinalFocus(closeType);
      if (mergedProps.actionsRef) return;
    }

    queueMicrotask(async () => {
      const element = content();
      if (element?.isConnected && typeof getComputedStyle === "function") {
        void getComputedStyle(element).animationName;
      }
      const animations =
        element && "getAnimations" in element
          ? element.getAnimations().filter((animation) => animation.playState !== "finished")
          : [];
      if (animations.length) {
        await Promise.allSettled(animations.map((animation) => animation.finished));
      }
      if (version !== completeVersion) return;
      if (!nextOpen) setPresent(false);
      mergedProps.onOpenChangeComplete?.(nextOpen);
    });
  });

  onMount(() => {
    if (isOpen()) queueMicrotask(() => queueMicrotask(() => focusInitialItem(pendingFocus)));
  });

  createEffect(() => {
    if (!isOpen()) return;
    const ownerDocument = trigger()?.ownerDocument ?? document;
    const ownerWindow = ownerDocument.defaultView ?? window;
    const body = ownerDocument.body;
    const previousOverflow = body.style.overflow;
    if (mergedProps.modal) body.style.overflow = "hidden";

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || trigger()?.contains(target) || content()?.contains(target)) {
        return;
      }
      const details = requestOpen(
        false,
        "outside-press",
        event,
        target as Element,
        "selected",
        mergedProps.modal,
      );
      if (details?.isCanceled) return;
      if (mergedProps.modal) event.preventDefault();
      if (!details?.isPropagationAllowed) event.stopPropagation();
    };
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || trigger()?.contains(target) || content()?.contains(target)) {
        return;
      }
      requestOpen(false, "focus-out", event, target as Element, "selected", false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const details = requestOpen(false, "escape-key", event, event.target as Element);
      if (details?.isCanceled) return;
      event.preventDefault();
      if (!details?.isPropagationAllowed) event.stopPropagation();
    };
    const handleResize = (event: UIEvent) => {
      requestOpen(false, "window-resize", event, undefined, "selected", false);
    };

    ownerDocument.addEventListener("pointerdown", handlePointerDown, true);
    ownerDocument.addEventListener("focusin", handleFocusIn, true);
    ownerDocument.addEventListener("keydown", handleEscape, true);
    ownerWindow.addEventListener("resize", handleResize);
    onCleanup(() => {
      ownerDocument.removeEventListener("pointerdown", handlePointerDown, true);
      ownerDocument.removeEventListener("focusin", handleFocusIn, true);
      ownerDocument.removeEventListener("keydown", handleEscape, true);
      ownerWindow.removeEventListener("resize", handleResize);
      if (mergedProps.modal) body.style.overflow = previousOverflow;
    });
  });

  createEffect(() => {
    const input = hiddenInput();
    const form = mergedProps.form
      ? input?.ownerDocument.getElementById(mergedProps.form)
      : input?.form;
    if (!(form instanceof HTMLFormElement)) return;

    const reset = () => {
      if (mergedProps.value === undefined) {
        setUncontrolledValue(
          (multiple() ? (mergedProps.defaultValue ?? []) : (mergedProps.defaultValue ?? null)) as
            | SelectValue
            | SelectValue[],
        );
      }
    };
    form.addEventListener("reset", reset);
    onCleanup(() => form.removeEventListener("reset", reset));
  });

  const actions: SelectActions = {
    unmount: () => {
      completeVersion += 1;
      previousOpen = isOpen();
      setHighlightedItem(undefined);
      stopScrolling();
      setPresent(false);
      mergedProps.onOpenChangeComplete?.(false);
    },
  };
  createEffect(() => {
    const actionsRef = mergedProps.actionsRef;
    if (!actionsRef) return;
    actionsRef.current = actions;
    onCleanup(() => {
      if (actionsRef.current === actions) actionsRef.current = null;
    });
  });

  onCleanup(() => {
    completeVersion += 1;
    clearInterval(scrollTimer);
    clearTimeout(typeaheadTimer);
    mergedProps.inputRef?.(undefined);
  });

  const context: SelectContextValue = {
    canScrollDown,
    canScrollUp,
    currentPlacement,
    disabled: () => mergedProps.disabled,
    handleItemKeyDown,
    hasSelectedValue,
    highlightItem,
    highlightItemOnHover: () => mergedProps.highlightItemOnHover,
    highlightedItem,
    inputType,
    isOpen,
    isReadOnly: () => mergedProps.readOnly,
    isSelected,
    listId,
    multiple,
    present,
    required: () => mergedProps.required,
    registerItem,
    requestOpen,
    selectItem,
    selectedLabel,
    selectedValue,
    setContent,
    setCurrentPlacement,
    setFinalFocus,
    setInputType,
    setPosition,
    setTrigger,
    startScrolling,
    stopScrolling,
    trigger,
    triggerId: () => trigger()?.id || rootId,
    typeahead,
    updateScrollState,
  };
  const serializedValue = () => {
    const currentValue = selectedValue();
    return multiple() || Array.isArray(currentValue) ? "" : serialize(currentValue);
  };
  const selectedValues = () => {
    const currentValue = selectedValue();
    return multiple() && Array.isArray(currentValue) ? currentValue : [];
  };
  const handleInputChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    if (event.defaultPrevented || mergedProps.disabled || mergedProps.readOnly || multiple())
      return;
    const nextValue = event.currentTarget.value.toLocaleLowerCase();
    const match = definitions().find(
      (item) =>
        serialize(item.value).toLocaleLowerCase() === nextValue ||
        labelText(item.label).toLocaleLowerCase() === nextValue,
    );
    if (match) setValue(match.value, "none", event, event.currentTarget);
  };

  return (
    <PopperPrimitive.Root
      anchorRef={trigger}
      contentRef={content}
      getAnchorRect={positioningAnchorRect}
      placement={selectPlacement(position())}
      onCurrentPlacementChange={setCurrentPlacement}
      gutter={position().sideOffset}
      shift={position().alignOffset}
      sameWidth
      fitViewport
    >
      <SelectContext.Provider value={context}>
        {mergedProps.children}
        <input
          ref={(element) => {
            setHiddenInput(element);
            mergedProps.inputRef?.(element);
          }}
          id={rootId && (!mergedProps.name || multiple()) ? `${rootId}-hidden-input` : undefined}
          form={mergedProps.form}
          name={multiple() ? undefined : mergedProps.name}
          autocomplete={mergedProps.autoComplete}
          value={serializedValue()}
          disabled={mergedProps.disabled}
          required={mergedProps.required && selectedValues().length === 0}
          readOnly={mergedProps.readOnly}
          tabIndex={-1}
          aria-hidden="true"
          class="sr-only"
          onFocus={() => trigger()?.focus()}
          onChange={handleInputChange}
        />
        <For each={selectedValues()}>
          {(value) => (
            <input
              type="hidden"
              form={mergedProps.form}
              name={mergedProps.name}
              value={serialize(value)}
              disabled={mergedProps.disabled}
            />
          )}
        </For>
      </SelectContext.Provider>
    </PopperPrimitive.Root>
  );
};

type SelectGroupProps<T extends ValidComponent = "div"> = Omit<ComponentProps<T>, "ref"> & {
  as?: T;
  ref?: (element: HTMLElement) => void;
};

const SelectGroup = <T extends ValidComponent = "div">(props: SelectGroupProps<T>) => {
  const [local, others] = splitProps(props as SelectGroupProps, ["as", "children", "class", "ref"]);
  const [labelId, setLabelId] = createSignal<string>();
  const context: SelectGroupContextValue = { labelId, setLabelId };

  return (
    <SelectGroupContext.Provider value={context}>
      <Dynamic
        component={local.as ?? "div"}
        {...others}
        ref={(element: HTMLElement) => setElementRef(local.ref, element)}
        role="group"
        aria-labelledby={labelId()}
        data-slot="select-group"
        class={cn("z-select-group", local.class)}
      >
        {local.children}
      </Dynamic>
    </SelectGroupContext.Provider>
  );
};

type SelectValueProps<Value = SelectValue, T extends ValidComponent = "span"> = Omit<
  ComponentProps<T>,
  "children"
> & {
  as?: T;
  children?: JSX.Element | ((value: Value) => JSX.Element);
  class?: string;
  placeholder?: JSX.Element;
};

const SelectValue = <Value = SelectValue, T extends ValidComponent = "span">(
  props: SelectValueProps<Value, T>,
) => {
  const rootContext = useSelectContext();
  const [local, others] = splitProps(props as SelectValueProps<Value, T>, [
    "as",
    "children",
    "class",
    "placeholder",
  ]);
  const content = createMemo(() => {
    if (typeof local.children === "function") {
      return local.children(rootContext.selectedValue() as Value);
    }
    if (local.children !== undefined) return local.children;
    const label = rootContext.selectedLabel();
    return label === "" ? local.placeholder : label;
  });

  return (
    <Dynamic
      component={local.as ?? "span"}
      {...others}
      data-placeholder={!rootContext.hasSelectedValue() ? "" : undefined}
      data-slot="select-value"
      class={cn("z-select-value", local.class)}
    >
      {content()}
    </Dynamic>
  );
};

type SelectTriggerProps<T extends ValidComponent = "button"> = Omit<
  ComponentProps<T>,
  "disabled" | "ref" | "size"
> & {
  as?: T;
  disabled?: boolean;
  nativeButton?: boolean;
  ref?: (element: HTMLElement) => void;
  size?: "default" | "sm";
};

const SelectTrigger = <T extends ValidComponent = "button">(rawProps: SelectTriggerProps<T>) => {
  const props = mergeProps({ nativeButton: true, size: "default" } as const, rawProps);
  const rootContext = useSelectContext();
  const [local, others] = splitProps(props as SelectTriggerProps, [
    "as",
    "children",
    "class",
    "disabled",
    "id",
    "nativeButton",
    "onClick",
    "onFocus",
    "onKeyDown",
    "onPointerDown",
    "ref",
    "size",
    "tabIndex",
  ]);
  const disabled = () => rootContext.disabled() || (local.disabled ?? false);
  const nativeButton = () => local.nativeButton && (local.as ?? "button") === "button";
  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || disabled()) return;

    if ([" ", "ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      event.preventDefault();
      rootContext.setInputType("keyboard");
      if (rootContext.isOpen()) return;
      rootContext.requestOpen(
        true,
        "trigger-press",
        event,
        event.currentTarget,
        event.key === "ArrowUp" ? "last" : "selected",
      );
      return;
    }
    rootContext.typeahead(event);
  };

  return (
    <Dynamic
      component={local.as ?? "button"}
      {...others}
      ref={(element: HTMLElement) => {
        rootContext.setTrigger(element);
        setElementRef(local.ref, element);
      }}
      id={local.id ?? rootContext.triggerId()}
      type={nativeButton() ? "button" : undefined}
      disabled={nativeButton() && disabled() ? true : undefined}
      role="combobox"
      aria-controls={rootContext.isOpen() ? rootContext.listId : undefined}
      aria-disabled={!nativeButton() && disabled() ? true : undefined}
      aria-expanded={rootContext.isOpen()}
      aria-haspopup="listbox"
      aria-readonly={rootContext.isReadOnly() || undefined}
      aria-required={rootContext.required() || undefined}
      tabIndex={local.tabIndex ?? (disabled() ? -1 : 0)}
      data-disabled={disabled() ? "" : undefined}
      data-placeholder={!rootContext.hasSelectedValue() ? "" : undefined}
      data-popup-open={rootContext.isOpen() ? "" : undefined}
      data-readonly={rootContext.isReadOnly() ? "" : undefined}
      data-required={rootContext.required() ? "" : undefined}
      data-size={local.size}
      data-slot="select-trigger"
      class={cn(
        "z-select-trigger flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
          event,
        );
        if (event.defaultPrevented || disabled()) return;
        rootContext.requestOpen(!rootContext.isOpen(), "trigger-press", event, event.currentTarget);
      }}
      onFocus={(event: FocusEvent & { currentTarget: HTMLElement; target: Element }) =>
        callEventHandler(
          local.onFocus as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
          event,
        )
      }
      onKeyDown={handleKeyDown}
      onPointerDown={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        rootContext.setInputType(
          event.pointerType === "touch" || event.pointerType === "pen"
            ? event.pointerType
            : "mouse",
        );
      }}
    >
      {local.children}
      <ChevronDown class="z-select-trigger-icon pointer-events-none" />
    </Dynamic>
  );
};

type SelectContentProps<T extends ValidComponent = "div"> = Omit<ComponentProps<T>, "ref"> & {
  align?: SelectAlign;
  alignItemWithTrigger?: boolean;
  alignOffset?: number;
  as?: T;
  finalFocus?: SelectFinalFocus;
  ref?: (element: HTMLElement) => void;
  side?: SelectSide;
  sideOffset?: number;
};

const SelectContent = <T extends ValidComponent = "div">(rawProps: SelectContentProps<T>) => {
  const props = mergeProps(
    {
      align: "center",
      alignItemWithTrigger: true,
      alignOffset: 0,
      side: "bottom",
      sideOffset: 4,
    } as const,
    rawProps,
  );
  const rootContext = useSelectContext();
  const [local, others] = splitProps(props as SelectContentProps, [
    "align",
    "alignItemWithTrigger",
    "alignOffset",
    "as",
    "children",
    "class",
    "finalFocus",
    "onKeyDown",
    "onPointerDown",
    "onScroll",
    "ref",
    "side",
    "sideOffset",
    "style",
  ]);
  const placement = () => placementParts(rootContext.currentPlacement());
  const style = createMemo(() =>
    mergeStyles(
      {
        "--anchor-width": "var(--kb-popper-anchor-width)",
        "--available-height": "var(--kb-popper-content-available-height)",
        "--transform-origin": "var(--kb-popper-content-transform-origin)",
      } as JSX.CSSProperties,
      local.style,
    ),
  );
  let resizeObserver: ResizeObserver | undefined;
  const setContent = (element: HTMLElement) => {
    rootContext.setContent(element);
    setElementRef(local.ref, element);
    queueMicrotask(rootContext.updateScrollState);
    if (typeof ResizeObserver === "function") {
      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(rootContext.updateScrollState);
      resizeObserver.observe(element);
    }
  };

  createEffect(() => {
    rootContext.setPosition({
      align: local.align ?? "center",
      alignItemWithTrigger: local.alignItemWithTrigger ?? true,
      alignOffset: local.alignOffset ?? 0,
      side: local.side ?? "bottom",
      sideOffset: local.sideOffset ?? 4,
    });
  });
  createEffect(() => rootContext.setFinalFocus(local.finalFocus));
  onCleanup(() => {
    resizeObserver?.disconnect();
    rootContext.stopScrolling();
    rootContext.setContent(undefined);
    rootContext.setFinalFocus(undefined);
  });

  return (
    <Show when={rootContext.present()}>
      <Portal ref={(element) => element.setAttribute("data-slot", "select-portal")}>
        <PopperPrimitive.Positioner class="isolate z-50" role="presentation">
          <Dynamic
            component={local.as ?? "div"}
            {...others}
            ref={setContent}
            inert={!rootContext.isOpen() ? true : undefined}
            data-align={placement().align}
            data-align-trigger={local.alignItemWithTrigger}
            data-closed={!rootContext.isOpen() ? "" : undefined}
            data-open={rootContext.isOpen() ? "" : undefined}
            data-side={placement().side}
            data-slot="select-content"
            style={style()}
            class={cn(
              "z-select-content z-select-content-logical z-menu-target z-menu-translucent relative isolate z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto data-[align-trigger=true]:animate-none data-closed:pointer-events-none",
              local.class,
            )}
            onKeyDown={(
              event: KeyboardEvent & {
                currentTarget: HTMLElement;
                target: Element;
              },
            ) =>
              callEventHandler(
                local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
                event,
              )
            }
            onPointerDown={(
              event: PointerEvent & {
                currentTarget: HTMLElement;
                target: Element;
              },
            ) => {
              callEventHandler(
                local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
                event,
              );
              rootContext.setInputType(
                event.pointerType === "touch" || event.pointerType === "pen"
                  ? event.pointerType
                  : "mouse",
              );
            }}
            onScroll={(event: Event & { currentTarget: HTMLElement; target: Element }) => {
              callEventHandler(
                local.onScroll as JSX.EventHandlerUnion<HTMLElement, Event> | undefined,
                event,
              );
              rootContext.updateScrollState();
            }}
          >
            <SelectScrollUpButton />
            <div
              id={rootContext.listId}
              role="listbox"
              aria-labelledby={rootContext.triggerId()}
              aria-multiselectable={rootContext.multiple() || undefined}
            >
              {local.children}
            </div>
            <SelectScrollDownButton />
          </Dynamic>
        </PopperPrimitive.Positioner>
      </Portal>
    </Show>
  );
};

type SelectLabelProps<T extends ValidComponent = "div"> = Omit<ComponentProps<T>, "ref"> & {
  as?: T;
  ref?: (element: HTMLElement) => void;
};

const SelectLabel = <T extends ValidComponent = "div">(props: SelectLabelProps<T>) => {
  const groupContext = useContext(SelectGroupContext);
  const [local, others] = splitProps(props as SelectLabelProps, ["as", "class", "id", "ref"]);
  const id = local.id ?? `select-group-label-${createUniqueId()}`;
  createEffect(() => groupContext?.setLabelId(id));
  onCleanup(() => {
    if (groupContext?.labelId() === id) groupContext.setLabelId(undefined);
  });

  return (
    <Dynamic
      component={local.as ?? "div"}
      {...others}
      ref={(element: HTMLElement) => setElementRef(local.ref, element)}
      id={id}
      data-slot="select-label"
      class={cn("z-select-label", local.class)}
    />
  );
};

type SelectItemProps<T extends ValidComponent = "div", Value = SelectValue> = Omit<
  ComponentProps<T>,
  "disabled" | "ref" | "value"
> & {
  as?: T;
  disabled?: boolean;
  label?: string;
  nativeButton?: boolean;
  ref?: (element: HTMLElement) => void;
  value?: Value;
};

const SelectItem = <T extends ValidComponent = "div", Value = SelectValue>(
  rawProps: SelectItemProps<T, Value>,
) => {
  const props = mergeProps({ disabled: false, nativeButton: false, value: null }, rawProps);
  const rootContext = useSelectContext();
  const [local, others] = splitProps(props as SelectItemProps, [
    "as",
    "children",
    "class",
    "disabled",
    "id",
    "label",
    "nativeButton",
    "onClick",
    "onFocus",
    "onKeyDown",
    "onPointerDown",
    "onPointerMove",
    "ref",
    "tabIndex",
    "value",
  ]);
  const id = local.id ?? `select-item-${createUniqueId()}`;
  const [element, setElement] = createSignal<HTMLElement>();
  const disabled = () => rootContext.disabled() || (local.disabled ?? false);
  const selected = () => rootContext.isSelected(local.value);
  const highlighted = () => rootContext.highlightedItem() === item;
  const item: RegisteredSelectItem = {
    disabled,
    element,
    label: () => local.label ?? element()?.textContent?.trim() ?? stringifyLabel(local.value),
    value: () => local.value,
  };
  createEffect(() => {
    const currentElement = element();
    if (!(currentElement instanceof HTMLButtonElement) || !local.nativeButton) return;
    currentElement.type = "button";
    currentElement.disabled = disabled();
  });
  let unregister: (() => void) | undefined;
  onMount(() => {
    unregister = rootContext.registerItem(item);
  });
  onCleanup(() => unregister?.());

  return (
    <Dynamic
      component={local.as ?? "div"}
      {...others}
      ref={(nextElement: HTMLElement) => {
        setElement(nextElement);
        setElementRef(local.ref, nextElement);
      }}
      id={id}
      role="option"
      aria-disabled={disabled() || undefined}
      aria-selected={selected()}
      tabIndex={local.tabIndex ?? (rootContext.isOpen() && highlighted() ? 0 : -1)}
      data-disabled={disabled() ? "" : undefined}
      data-highlighted={highlighted() ? "" : undefined}
      data-selected={selected() ? "" : undefined}
      data-slot="select-item"
      class={cn(
        "z-select-item relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
          event,
        );
        if (!event.defaultPrevented) rootContext.selectItem(item, event);
      }}
      onFocus={(event: FocusEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onFocus as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
          event,
        );
        if (!event.defaultPrevented && !disabled()) rootContext.highlightItem(item);
      }}
      onKeyDown={(event: KeyboardEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
          event,
        );
        rootContext.handleItemKeyDown(item, event);
      }}
      onPointerDown={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        if (event.defaultPrevented || disabled()) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
      }}
      onPointerMove={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
        callEventHandler(
          local.onPointerMove as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
          event,
        );
        if (
          event.defaultPrevented ||
          disabled() ||
          event.pointerType !== "mouse" ||
          !rootContext.highlightItemOnHover()
        ) {
          return;
        }
        rootContext.setInputType("mouse");
        event.currentTarget.focus({ preventScroll: true });
      }}
    >
      <span class="z-select-item-text shrink-0 whitespace-nowrap">{local.children}</span>
      <Show when={selected()}>
        <span class="z-select-item-indicator" data-slot="select-item-indicator">
          <Check class="z-select-item-indicator-icon pointer-events-none" />
        </span>
      </Show>
    </Dynamic>
  );
};

type SelectSeparatorProps<T extends ValidComponent = "div"> = Omit<ComponentProps<T>, "ref"> & {
  as?: T;
  orientation?: "horizontal" | "vertical";
  ref?: (element: HTMLElement) => void;
};

const SelectSeparator = <T extends ValidComponent = "div">(rawProps: SelectSeparatorProps<T>) => {
  const props = mergeProps({ orientation: "horizontal" } as const, rawProps);
  const [local, others] = splitProps(props as SelectSeparatorProps, [
    "as",
    "class",
    "orientation",
    "ref",
  ]);
  return (
    <Dynamic
      component={local.as ?? "div"}
      {...others}
      ref={(element: HTMLElement) => setElementRef(local.ref, element)}
      role="separator"
      aria-orientation={local.orientation}
      data-orientation={local.orientation}
      data-slot="select-separator"
      class={cn("z-select-separator pointer-events-none", local.class)}
    />
  );
};

type SelectScrollButtonProps<T extends ValidComponent = "div"> = Omit<ComponentProps<T>, "ref"> & {
  as?: T;
  keepMounted?: boolean;
  ref?: (element: HTMLElement) => void;
};

type SelectScrollButtonInternalProps<T extends ValidComponent = "div"> =
  SelectScrollButtonProps<T> & {
    direction: "down" | "up";
  };

const SelectScrollButton = <T extends ValidComponent = "div">(
  props: SelectScrollButtonInternalProps<T>,
) => {
  const rootContext = useSelectContext();
  const [local, others] = splitProps(props as SelectScrollButtonInternalProps, [
    "as",
    "class",
    "direction",
    "keepMounted",
    "onPointerEnter",
    "onPointerLeave",
    "ref",
  ]);
  const isDown = () => local.direction === "down";
  const canScroll = () => (isDown() ? rootContext.canScrollDown() : rootContext.canScrollUp());
  const shouldRender = () =>
    rootContext.inputType() !== "touch" && (local.keepMounted || canScroll());

  return (
    <Show when={shouldRender()}>
      <Dynamic
        component={local.as ?? "div"}
        {...others}
        ref={(element: HTMLElement) => setElementRef(local.ref, element)}
        aria-hidden="true"
        data-slot={isDown() ? "select-scroll-down-button" : "select-scroll-up-button"}
        class={cn(
          isDown()
            ? "z-select-scroll-down-button sticky bottom-0 w-full"
            : "z-select-scroll-up-button sticky top-0 w-full",
          local.keepMounted && !canScroll() && "invisible",
          local.class,
        )}
        onPointerEnter={(
          event: PointerEvent & {
            currentTarget: HTMLElement;
            target: Element;
          },
        ) => {
          callEventHandler(
            local.onPointerEnter as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
            event,
          );
          if (!event.defaultPrevented) rootContext.startScrolling(isDown() ? 1 : -1);
        }}
        onPointerLeave={(
          event: PointerEvent & {
            currentTarget: HTMLElement;
            target: Element;
          },
        ) => {
          callEventHandler(
            local.onPointerLeave as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
            event,
          );
          rootContext.stopScrolling();
        }}
      >
        <Show when={isDown()} fallback={<ChevronUp />}>
          <ChevronDown />
        </Show>
      </Dynamic>
    </Show>
  );
};

const SelectScrollUpButton = <T extends ValidComponent = "div">(
  props: SelectScrollButtonProps<T>,
) => <SelectScrollButton {...props} direction="up" />;

const SelectScrollDownButton = <T extends ValidComponent = "div">(
  props: SelectScrollButtonProps<T>,
) => <SelectScrollButton {...props} direction="down" />;

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
