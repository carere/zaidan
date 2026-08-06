import type {
  ComboboxContentProps as ComboboxPrimitiveContentProps,
  ComboboxInputProps as ComboboxPrimitiveInputProps,
  ComboboxItemProps as ComboboxPrimitiveItemProps,
  ComboboxListboxProps as ComboboxPrimitiveListProps,
  ComboboxTriggerProps as ComboboxPrimitiveTriggerProps,
} from "@kobalte/core/combobox";
import * as ComboboxPrimitive from "@kobalte/core/combobox";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type { Collection, CollectionNode } from "@kobalte/core/primitives/create-collection";
import type { SeparatorRootProps } from "@kobalte/core/separator";
import * as SeparatorPrimitive from "@kobalte/core/separator";
import { Check, ChevronDown, X } from "lucide-solid";
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
import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/kobalte/ui/input-group";

type ComboboxSide = "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
type ComboboxAlign = "start" | "center" | "end";
type ComboboxPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

type ComboboxAnchor = {
  (): HTMLDivElement | undefined;
  (element: HTMLDivElement): void;
};

type ComboboxAnchorValue =
  | ComboboxAnchor
  | Accessor<HTMLElement | undefined>
  | HTMLElement
  | { current?: HTMLElement | null }
  | null;

type ComboboxChangeEventReason =
  | "trigger-press"
  | "outside-press"
  | "item-press"
  | "close-press"
  | "escape-key"
  | "list-navigation"
  | "focus-out"
  | "input-change"
  | "input-clear"
  | "clear-press"
  | "chip-remove-press"
  | "none";

type ComboboxChangeEventDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  event: Event;
  reason: ComboboxChangeEventReason;
  trigger: Element | undefined;
};

type ComboboxHighlightEventDetails = {
  event: Event;
  index: number;
  reason: "keyboard" | "pointer" | "none";
};

type ComboboxInteractionType = "mouse" | "touch" | "pen" | "keyboard";

type ComboboxFocusTarget =
  | boolean
  | HTMLElement
  | { current?: HTMLElement | null }
  | { value?: HTMLElement | null }
  | ((interactionType: ComboboxInteractionType) => undefined | boolean | HTMLElement | null);

type ComboboxActions = {
  unmount: () => void;
};

type ComboboxExternalRef<T> = ((value: T) => void) | { current?: T | null } | { value?: T | null };

type ComboboxGroupOption<Option> = {
  items: readonly Option[];
  value?: unknown;
} & Record<string, unknown>;

interface ComboboxAdapterContextValue {
  anchor: Accessor<ComboboxAnchorValue | undefined>;
  autoHighlight: Accessor<boolean | "always">;
  completeOpenChange: (open: boolean) => void;
  consumeChangeDetails: (fallback: ComboboxChangeEventReason) => ComboboxChangeEventDetails;
  consumeHighlightDetails: (index: number) => ComboboxHighlightEventDetails;
  currentPlacement: Accessor<ComboboxPlacement>;
  defaultInputValue: Accessor<string | undefined>;
  disabled: Accessor<boolean>;
  externallyVirtualized: Accessor<boolean>;
  forceUnmounted: Accessor<boolean>;
  form: Accessor<string | undefined>;
  grid: Accessor<boolean>;
  hasStandaloneTrigger: Accessor<boolean>;
  highlightItemOnHover: Accessor<boolean>;
  inline: Accessor<boolean>;
  inputInsidePopup: Accessor<boolean>;
  inputSyncVersion: Accessor<number>;
  inputValue: Accessor<string | undefined>;
  interactionType: Accessor<ComboboxInteractionType>;
  isItemEqualToValue: (item: unknown, value: unknown) => boolean;
  itemToStringLabel: (item: unknown) => string;
  itemToStringValue: (item: unknown) => string;
  keepHighlight: Accessor<boolean>;
  loopFocus: Accessor<boolean>;
  onItemHighlighted: Accessor<
    ((item: unknown | undefined, details: ComboboxHighlightEventDetails) => void) | undefined
  >;
  open: Accessor<boolean>;
  openOnInputClick: Accessor<boolean>;
  readOnly: Accessor<boolean>;
  registerItem: (item: unknown) => () => void;
  registerStandaloneTrigger: () => void;
  required: Accessor<boolean>;
  setChangeDetails: (reason: ComboboxChangeEventReason, event: Event, trigger?: Element) => void;
  setHighlightDetails: (reason: "keyboard" | "pointer", event: Event) => void;
  setInputInsidePopup: (inside: boolean) => void;
  syncInputValue: () => void;
  setContentPosition: (position: {
    align: ComboboxAlign;
    alignOffset: number;
    anchor: ComboboxAnchorValue | undefined;
    side: ComboboxSide;
    sideOffset: number;
  }) => void;
  submitOnItemClick: Accessor<boolean>;
}

interface ComboboxGroupCollectionContextValue {
  items: CollectionNode[];
}

interface ComboboxGroupLabelContextValue {
  labelId: Accessor<string | undefined>;
  setLabelId: (id: string | undefined) => void;
}

const ComboboxAdapterContext = createContext<ComboboxAdapterContextValue>();
const ComboboxGroupCollectionContext = createContext<ComboboxGroupCollectionContextValue>();
const ComboboxGroupLabelContext = createContext<ComboboxGroupLabelContextValue>();
const ComboboxItemNodeContext = createContext<CollectionNode>();

function useComboboxAdapterContext() {
  const context = useContext(ComboboxAdapterContext);

  if (!context) {
    throw new Error("Combobox parts must be used within Combobox");
  }

  return context;
}

function callEventHandler(handler: unknown, event: Event) {
  if (typeof handler === "function") {
    handler(event);
    return;
  }

  if (Array.isArray(handler) && typeof handler[0] === "function") {
    handler[0](handler[1], event);
  }
}

function setExternalRef<T>(ref: ComboboxExternalRef<T> | undefined, value: T) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref && "value" in ref) {
    ref.value = value;
  } else if (ref && "current" in ref) {
    ref.current = value;
  }
}

function createComboboxChangeEventDetails(
  reason: ComboboxChangeEventReason,
  event = new Event("combobox"),
  trigger?: Element,
): ComboboxChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    allowPropagation: () => {
      propagationAllowed = true;
    },
    cancel: () => {
      canceled = true;
    },
    event,
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

function finalizeComboboxChangeEvent(details: ComboboxChangeEventDetails) {
  if (!details.isPropagationAllowed) {
    details.event.stopPropagation();
  }
}

function getInteractionType(event: Event): ComboboxInteractionType {
  if (typeof KeyboardEvent !== "undefined" && event instanceof KeyboardEvent) {
    return "keyboard";
  }

  if (typeof PointerEvent !== "undefined" && event instanceof PointerEvent) {
    return event.pointerType === "touch" || event.pointerType === "pen"
      ? event.pointerType
      : "mouse";
  }

  if (typeof TouchEvent !== "undefined" && event instanceof TouchEvent) {
    return "touch";
  }

  return "mouse";
}

function getNativeEvent(event: Event) {
  const originalEvent = (event as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent;
  return originalEvent instanceof Event ? originalEvent : event;
}

function resolveFocusTarget(
  target: ComboboxFocusTarget | undefined,
  interactionType: ComboboxInteractionType,
) {
  const resolved = typeof target === "function" ? target(interactionType) : target;

  if (resolved && typeof resolved === "object" && !(resolved instanceof HTMLElement)) {
    return "value" in resolved
      ? resolved.value
      : "current" in resolved
        ? resolved.current
        : undefined;
  }

  return resolved;
}

function resolveAnchor(anchor: ComboboxAnchorValue | undefined) {
  if (!anchor) {
    return undefined;
  }

  if (typeof HTMLElement !== "undefined" && anchor instanceof HTMLElement) {
    return anchor;
  }

  if (typeof anchor === "function") {
    return anchor();
  }

  return "current" in anchor ? (anchor.current ?? undefined) : undefined;
}

function toPlacement(side: ComboboxSide, align: ComboboxAlign): ComboboxPlacement {
  const physicalSide = side === "inline-start" ? "left" : side === "inline-end" ? "right" : side;

  if (align === "center") {
    return physicalSide;
  }

  return `${physicalSide}-${align}` as ComboboxPlacement;
}

function defaultItemString(item: unknown, property: "label" | "value") {
  if (item && typeof item === "object" && property in item) {
    return String((item as Record<string, unknown>)[property]);
  }

  return String(item ?? "");
}

function moveComboboxGridHighlight(
  adapter: ComboboxAdapterContextValue,
  state: ReturnType<typeof ComboboxPrimitive.useComboboxContext>,
  event: KeyboardEvent,
) {
  if (!adapter.grid() || !state.isOpen() || !event.key.startsWith("Arrow")) {
    return;
  }

  const list = state.contentRef()?.querySelector<HTMLElement>("[role=grid]");

  if (!list) {
    return;
  }

  const rows = [...list.querySelectorAll<HTMLElement>("[role=row]")]
    .map((row) =>
      [...row.querySelectorAll<HTMLElement>("[data-key]")].filter(
        (item) => !item.hasAttribute("data-disabled"),
      ),
    )
    .filter((row) => row.length > 0);

  if (rows.length === 0) {
    return;
  }

  const manager = state.listState().selectionManager();
  const focusedKey = manager.focusedKey();

  if (focusedKey == null && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    return;
  }

  let rowIndex = rows.findIndex((row) => row.some((item) => item.dataset.key === focusedKey));
  let columnIndex =
    rowIndex < 0 ? -1 : rows[rowIndex].findIndex((item) => item.dataset.key === focusedKey);

  if (rowIndex < 0 || columnIndex < 0) {
    rowIndex = event.key === "ArrowUp" || event.key === "ArrowLeft" ? rows.length - 1 : 0;
    columnIndex =
      event.key === "ArrowUp" || event.key === "ArrowLeft" ? rows[rowIndex].length - 1 : 0;
  } else if (event.key === "ArrowRight") {
    if (columnIndex < rows[rowIndex].length - 1) {
      columnIndex++;
    } else if (adapter.loopFocus()) {
      rowIndex = (rowIndex + 1) % rows.length;
      columnIndex = 0;
    }
  } else if (event.key === "ArrowLeft") {
    if (columnIndex > 0) {
      columnIndex--;
    } else if (adapter.loopFocus()) {
      rowIndex = (rowIndex - 1 + rows.length) % rows.length;
      columnIndex = rows[rowIndex].length - 1;
    }
  } else {
    const rowDelta = event.key === "ArrowDown" ? 1 : -1;
    const nextRow = rowIndex + rowDelta;

    if (nextRow >= 0 && nextRow < rows.length) {
      rowIndex = nextRow;
    } else if (adapter.loopFocus()) {
      rowIndex = nextRow < 0 ? rows.length - 1 : 0;
    }

    columnIndex = Math.min(columnIndex, rows[rowIndex].length - 1);
  }

  const targetKey = rows[rowIndex][columnIndex]?.dataset.key;

  if (!targetKey) {
    return;
  }

  event.preventDefault();
  queueMicrotask(() => manager.setFocusedKey(targetKey));
}

type ComboboxValueType<Option, Multiple extends boolean | undefined> = Multiple extends true
  ? Option[]
  : Option;

type ComboboxProps<Option, Multiple extends boolean | undefined = false> = {
  actionsRef?: ComboboxExternalRef<ComboboxActions>;
  autoComplete?: string;
  autoHighlight?: boolean | "always";
  children?: JSX.Element;
  defaultOpen?: boolean;
  defaultInputValue?: string;
  defaultValue?: ComboboxValueType<Option, Multiple> | null;
  disabled?: boolean;
  filter?:
    | null
    | ((item: Option, query: string, itemToString?: (item: Option) => string) => boolean);
  filteredItems?: readonly (Option | ComboboxGroupOption<Option>)[];
  form?: string;
  grid?: boolean;
  highlightItemOnHover?: boolean;
  id?: string;
  inline?: boolean;
  inputRef?: ComboboxExternalRef<HTMLInputElement>;
  inputValue?: string;
  isItemEqualToValue?: (item: Option, value: Option) => boolean;
  items?: readonly (Option | ComboboxGroupOption<Option>)[];
  itemToStringLabel?: (item: Option) => string;
  itemToStringValue?: (item: Option) => string;
  keepHighlight?: boolean;
  limit?: number;
  locale?: Intl.LocalesArgument;
  loopFocus?: boolean;
  modal?: boolean;
  multiple?: Multiple;
  name?: string;
  onInputValueChange?: (value: string, details: ComboboxChangeEventDetails) => void;
  onItemHighlighted?: (item: Option | undefined, details: ComboboxHighlightEventDetails) => void;
  onOpenChange?: (open: boolean, details: ComboboxChangeEventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  onValueChange?: (
    value: ComboboxValueType<Option, Multiple> | (Multiple extends true ? never : null),
    details: ComboboxChangeEventDetails,
  ) => void;
  open?: boolean;
  openOnInputClick?: boolean;
  readOnly?: boolean;
  required?: boolean;
  submitOnItemClick?: boolean;
  value?: ComboboxValueType<Option, Multiple> | null;
  virtualized?: boolean;
};

const ComboboxRootSlot = (props: ComponentProps<"div">) => <>{props.children}</>;

const ComboboxStateBridge = () => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  let highlightedKey: string | undefined;
  let initializedHighlight = false;

  onMount(() => {
    const inputValue = adapter.inputValue() ?? adapter.defaultInputValue();

    if (inputValue !== undefined) {
      state.setInputValue(inputValue);
    }
  });

  createEffect(() => {
    adapter.inputSyncVersion();
    const inputValue = adapter.inputValue();

    if (inputValue !== undefined && inputValue !== state.inputValue()) {
      state.setInputValue(inputValue);
    }
  });

  createEffect(() => {
    const mode = adapter.autoHighlight();
    const shouldHighlight =
      state.isOpen() && (mode === "always" || (mode && Boolean(state.inputValue())));

    if (!shouldHighlight) {
      return;
    }

    const selectionManager = state.listState().selectionManager();
    const firstKey = [...state.listState().collection()].find(
      (node) => node.type === "item" && !node.disabled,
    )?.key;

    if (firstKey && selectionManager.focusedKey() !== firstKey) {
      selectionManager.setFocusedKey(firstKey);
    }
  });

  createEffect(() => {
    const key = state.listState().selectionManager().focusedKey();

    if (!initializedHighlight) {
      initializedHighlight = true;
      highlightedKey = key;
      return;
    }

    if (key === highlightedKey) {
      return;
    }

    highlightedKey = key;
    const items = [...state.listState().collection()].filter((node) => node.type === "item");
    const index = key ? items.findIndex((item) => item.key === key) : -1;
    adapter.onItemHighlighted()?.(
      key ? state.listState().collection().getItem(key)?.rawValue : undefined,
      adapter.consumeHighlightDetails(index),
    );
  });

  return null;
};

const visuallyHiddenInputStyle: JSX.CSSProperties = {
  border: "0",
  "clip-path": "inset(50%)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  "white-space": "nowrap",
  width: "1px",
};

type ComboboxFormControlProps<Option> = {
  autoComplete?: string;
  disabled?: boolean;
  form?: string;
  id?: string;
  inputRef?: ComboboxExternalRef<HTMLInputElement>;
  items: readonly Option[];
  multiple: boolean;
  name?: string;
  readOnly?: boolean;
  required?: boolean;
  selectedValue: Option | Option[] | null | undefined;
};

const ComboboxFormControl = <Option,>(props: ComboboxFormControlProps<Option>) => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  const selectedValues = createMemo(() =>
    Array.isArray(props.selectedValue)
      ? props.selectedValue
      : props.selectedValue == null
        ? []
        : [props.selectedValue],
  );
  const serializedValues = createMemo(() =>
    selectedValues().map((value) => adapter.itemToStringValue(value)),
  );
  const hasMultipleSelection = () => props.multiple && selectedValues().length > 0;
  const hiddenInputName = () => (props.multiple ? undefined : props.name);

  return (
    <>
      <input
        id={props.id && hiddenInputName() == null ? `${props.id}-hidden-input` : undefined}
        ref={(element) => setExternalRef(props.inputRef, element)}
        form={props.form}
        name={hiddenInputName()}
        autocomplete={props.autoComplete}
        disabled={props.disabled}
        required={props.required && !hasMultipleSelection()}
        readOnly={props.readOnly}
        value={props.multiple ? "" : (serializedValues()[0] ?? "")}
        style={visuallyHiddenInputStyle}
        tabIndex={-1}
        aria-hidden="true"
        onFocus={() =>
          (adapter.inputInsidePopup()
            ? (state.triggerRef() ?? state.inputRef())
            : (state.inputRef() ?? state.triggerRef())
          )?.focus()
        }
        onChange={(event) => {
          if (props.disabled || props.readOnly || props.multiple) {
            return;
          }

          const nextValue = event.currentTarget.value.toLocaleLowerCase();
          const match = props.items.find(
            (item) =>
              adapter.itemToStringValue(item).toLocaleLowerCase() === nextValue ||
              adapter.itemToStringLabel(item).toLocaleLowerCase() === nextValue,
          );

          if (match !== undefined) {
            adapter.setChangeDetails("none", event, event.currentTarget);
            state.listState().selectionManager().replaceSelection(adapter.itemToStringValue(match));
          }
        }}
      />
      <Show when={props.multiple && props.name}>
        <For each={serializedValues()}>
          {(value) => (
            <input
              type="hidden"
              form={props.form}
              name={props.name}
              value={value}
              disabled={props.disabled}
            />
          )}
        </For>
      </Show>
    </>
  );
};

const Combobox = <Option, Multiple extends boolean | undefined = false>(
  props: ComboboxProps<Option, Multiple>,
) => {
  const [local] = splitProps(props, [
    "actionsRef",
    "autoComplete",
    "autoHighlight",
    "children",
    "defaultOpen",
    "defaultInputValue",
    "defaultValue",
    "disabled",
    "filter",
    "filteredItems",
    "form",
    "grid",
    "highlightItemOnHover",
    "id",
    "inline",
    "inputRef",
    "inputValue",
    "isItemEqualToValue",
    "items",
    "itemToStringLabel",
    "itemToStringValue",
    "keepHighlight",
    "limit",
    "locale",
    "loopFocus",
    "modal",
    "multiple",
    "name",
    "onInputValueChange",
    "onItemHighlighted",
    "onOpenChange",
    "onOpenChangeComplete",
    "onValueChange",
    "open",
    "openOnInputClick",
    "readOnly",
    "required",
    "submitOnItemClick",
    "value",
    "virtualized",
  ]);

  const [side, setSide] = createSignal<ComboboxSide>("bottom");
  const [align, setAlign] = createSignal<ComboboxAlign>("start");
  const [sideOffset, setSideOffset] = createSignal(6);
  const [alignOffset, setAlignOffset] = createSignal(0);
  const [anchor, setAnchor] = createSignal<ComboboxAnchorValue>();
  const [currentPlacement, setCurrentPlacement] = createSignal<ComboboxPlacement>("bottom-start");
  const [hasStandaloneTrigger, setHasStandaloneTrigger] = createSignal(false);
  const [currentInputValue, setCurrentInputValue] = createSignal(local.defaultInputValue ?? "");
  const [interactionType, setInteractionType] = createSignal<ComboboxInteractionType>("keyboard");
  const [forceUnmounted, setForceUnmounted] = createSignal(false);
  const [inputInsidePopup, setInputInsidePopup] = createSignal(false);
  const [inputSyncVersion, setInputSyncVersion] = createSignal(0);
  const [retainContent, setRetainContent] = createSignal(false);
  const [registeredItems, setRegisteredItems] = createSignal<Option[]>([]);
  let pendingChangeDetails: ComboboxChangeEventDetails | undefined;
  let pendingHighlightDetails: { event: Event; reason: "keyboard" | "pointer" } | undefined;
  let pendingOpenCompletion: boolean | undefined;

  const sourceItems = createMemo(
    () =>
      local.items ??
      local.filteredItems ??
      (registeredItems() as Array<Option | ComboboxGroupOption<Option>>),
  );
  const candidateItems = createMemo(() => local.filteredItems ?? sourceItems());

  const isGroup = (
    item: Option | ComboboxGroupOption<Option>,
  ): item is ComboboxGroupOption<Option> =>
    item !== null &&
    typeof item === "object" &&
    "items" in item &&
    Array.isArray((item as { items?: unknown }).items);

  const allItems = createMemo(() =>
    sourceItems().flatMap((item) => (isGroup(item) ? [...item.items] : [item])),
  );

  const canonicalizeItem = (item: Option) => {
    if (!local.isItemEqualToValue) {
      return item;
    }

    return allItems().find((candidate) => local.isItemEqualToValue?.(candidate, item)) ?? item;
  };

  const itemToStringValue = (item: Option) => {
    if (local.itemToStringValue) {
      return local.itemToStringValue(item);
    }

    if (item && typeof item === "object" && "value" in item) {
      return String((item as { value?: unknown }).value);
    }

    const index = allItems().findIndex((candidate) =>
      local.isItemEqualToValue
        ? local.isItemEqualToValue(candidate, item)
        : Object.is(candidate, item),
    );

    return index >= 0 && typeof item === "object"
      ? `combobox-item-${index}`
      : defaultItemString(item, "value");
  };

  const itemToStringLabel = (item: Option) => {
    if (local.itemToStringLabel) {
      return local.itemToStringLabel(item);
    }

    return defaultItemString(item, "label");
  };

  const collator = createMemo(
    () => new Intl.Collator(local.locale, { sensitivity: "base", usage: "search" }),
  );

  const matches = (item: Option, inputValue: string) => {
    if (local.filteredItems) {
      return true;
    }

    if (local.filter === null) {
      return true;
    }

    if (local.filter) {
      return local.filter(item, inputValue, itemToStringLabel);
    }

    const label = itemToStringLabel(item);

    if (inputValue === "") {
      return true;
    }

    for (let index = 0; index <= label.length - inputValue.length; index++) {
      if (collator().compare(label.slice(index, index + inputValue.length), inputValue) === 0) {
        return true;
      }
    }

    return false;
  };

  const visibleItems = (inputValue: string) => {
    let remaining = local.limit === undefined || local.limit < 0 ? Infinity : local.limit;
    const result: Option[] = [];

    if (remaining === 0) {
      return result;
    }

    for (const entry of candidateItems()) {
      if (isGroup(entry)) {
        for (const item of entry.items) {
          if (matches(item, inputValue)) {
            result.push(item);
            remaining--;
          }

          if (remaining === 0) {
            break;
          }
        }
      } else if (matches(entry, inputValue)) {
        result.push(entry);
        remaining--;
      }

      if (remaining === 0) {
        break;
      }
    }

    return result;
  };

  const hasGroups = createMemo(() => sourceItems().some(isGroup));

  const isSameItem = (item: Option, candidate: Option) =>
    local.isItemEqualToValue
      ? local.isItemEqualToValue(item, candidate)
      : Object.is(item, candidate);

  const consumeChangeDetails = (fallback: ComboboxChangeEventReason) => {
    return pendingChangeDetails ?? createComboboxChangeEventDetails(fallback);
  };

  const consumeHighlightDetails = (index: number): ComboboxHighlightEventDetails => {
    const details = pendingHighlightDetails;
    pendingHighlightDetails = undefined;
    return {
      event: details?.event ?? new Event("combobox"),
      index,
      reason: details?.reason ?? "none",
    };
  };

  const normalizeSelection = (
    value: Option | Option[] | null | undefined,
  ): ComboboxValueType<Option, Multiple> | null | undefined =>
    (Array.isArray(value)
      ? value.map(canonicalizeItem)
      : value === null
        ? null
        : value === undefined
          ? undefined
          : canonicalizeItem(value)) as ComboboxValueType<Option, Multiple> | null | undefined;

  const normalizedDefaultValue = createMemo(() =>
    normalizeSelection(local.defaultValue ?? (local.multiple ? [] : null)),
  );
  const [uncontrolledValue, setUncontrolledValue] = createSignal(normalizedDefaultValue());
  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(local.defaultOpen ?? false);
  const effectiveValue = createMemo(() =>
    local.value === undefined ? uncontrolledValue() : normalizeSelection(local.value),
  );
  const effectiveOpen = () => local.open ?? uncontrolledOpen();
  let initializedOpen = false;

  onMount(() => {
    setExternalRef(local.actionsRef, {
      unmount: () => {
        setForceUnmounted(true);
        setRetainContent(false);
        pendingOpenCompletion = undefined;
        local.onOpenChangeComplete?.(false);
      },
    });
  });

  createEffect(() => {
    const open = effectiveOpen();

    if (!initializedOpen) {
      initializedOpen = true;
      if (open) {
        setRetainContent(true);
        pendingOpenCompletion = true;
      }
      return;
    }

    if (open) {
      setForceUnmounted(false);
      setRetainContent(true);
    }
    pendingOpenCompletion = open;
  });

  const adapter: ComboboxAdapterContextValue = {
    anchor,
    autoHighlight: () => local.autoHighlight ?? false,
    completeOpenChange: (open) => {
      if ((!open && local.actionsRef) || pendingOpenCompletion !== open) {
        return;
      }

      pendingOpenCompletion = undefined;
      local.onOpenChangeComplete?.(open);
    },
    consumeChangeDetails,
    consumeHighlightDetails,
    currentPlacement,
    defaultInputValue: () => local.defaultInputValue,
    disabled: () => local.disabled ?? false,
    externallyVirtualized: () => local.virtualized ?? false,
    forceUnmounted,
    form: () => local.form,
    grid: () => local.grid ?? false,
    hasStandaloneTrigger,
    highlightItemOnHover: () => local.highlightItemOnHover ?? true,
    inline: () => local.inline ?? false,
    inputInsidePopup,
    inputSyncVersion,
    inputValue: () => local.inputValue ?? currentInputValue(),
    interactionType,
    isItemEqualToValue: (item, value) => isSameItem(item as Option, value as Option),
    itemToStringLabel: (item) => itemToStringLabel(item as Option),
    itemToStringValue: (item) => itemToStringValue(item as Option),
    keepHighlight: () => local.keepHighlight ?? false,
    loopFocus: () => local.loopFocus ?? true,
    onItemHighlighted: () =>
      local.onItemHighlighted as
        | ((item: unknown | undefined, details: ComboboxHighlightEventDetails) => void)
        | undefined,
    open: effectiveOpen,
    openOnInputClick: () => local.openOnInputClick ?? true,
    readOnly: () => local.readOnly ?? false,
    registerItem: (item) => {
      const option = item as Option;
      setRegisteredItems((items) =>
        items.some((candidate) => isSameItem(candidate, option)) ? items : [...items, option],
      );
      return () =>
        setRegisteredItems((items) => items.filter((candidate) => !isSameItem(candidate, option)));
    },
    registerStandaloneTrigger: () => setHasStandaloneTrigger(true),
    required: () => local.required ?? false,
    setChangeDetails: (reason, event, trigger) => {
      setInteractionType(getInteractionType(event));
      const details = createComboboxChangeEventDetails(reason, event, trigger);
      pendingChangeDetails = details;
      queueMicrotask(() => {
        if (pendingChangeDetails === details) {
          pendingChangeDetails = undefined;
        }
      });
    },
    setContentPosition: (position) => {
      setSide(position.side);
      setAlign(position.align);
      setSideOffset(position.sideOffset);
      setAlignOffset(position.alignOffset);
      setAnchor(() => position.anchor);
      setCurrentPlacement(toPlacement(position.side, position.align));
    },
    setHighlightDetails: (reason, event) => {
      pendingHighlightDetails = { event, reason };
    },
    setInputInsidePopup,
    syncInputValue: () => setInputSyncVersion((version) => version + 1),
    submitOnItemClick: () => local.submitOnItemClick ?? false,
  };

  return (
    <ComboboxPrimitive.Root<Option, ComboboxGroupOption<Option>>
      as={ComboboxRootSlot as unknown as "div"}
      id={local.id}
      name={local.name}
      required={false}
      open={effectiveOpen()}
      forceMount={Boolean(local.actionsRef) && retainContent()}
      modal={local.modal}
      options={[...sourceItems()]}
      optionValue={itemToStringValue}
      optionTextValue={itemToStringLabel}
      optionLabel={itemToStringLabel}
      optionGroupChildren={hasGroups() ? "items" : undefined}
      defaultFilter={(item, inputValue) =>
        visibleItems(inputValue).some((candidate) => isSameItem(item, candidate))
      }
      disabled={local.disabled}
      readOnly={local.readOnly}
      value={effectiveValue() as Option & Option[]}
      defaultValue={normalizedDefaultValue() as Option & Option[]}
      multiple={local.multiple as true}
      onChange={(value: Option | Option[]) => {
        const details = consumeChangeDetails("none");
        const normalizedValue = normalizeSelection(value);
        local.onValueChange?.(
          normalizedValue as
            | ComboboxValueType<Option, Multiple>
            | (Multiple extends true ? never : null),
          details,
        );
        finalizeComboboxChangeEvent(details);

        if (!details.isCanceled && local.value === undefined) {
          setUncontrolledValue(() => normalizedValue);
        }
      }}
      onInputChange={(value) => {
        const details = consumeChangeDetails("none");
        local.onInputValueChange?.(value, details);
        finalizeComboboxChangeEvent(details);

        if (!details.isCanceled && local.inputValue === undefined) {
          setCurrentInputValue(value);
        } else {
          adapter.syncInputValue();
        }
      }}
      onOpenChange={(open, mode) => {
        const details = consumeChangeDetails(mode === "input" ? "input-change" : "none");
        local.onOpenChange?.(open, details);
        finalizeComboboxChangeEvent(details);

        if (!details.isCanceled && local.open === undefined) {
          setUncontrolledOpen(open);
        }
      }}
      triggerMode="input"
      shouldFocusWrap={false}
      allowsEmptyCollection
      closeOnSelection={!local.multiple}
      // Kobalte uses `virtualized` to enable caller-rendered collection children. The Base UI
      // `virtualized` prop is tracked separately and only disables wrapper-owned scrolling.
      virtualized
      sameWidth={false}
      placement={toPlacement(side(), align())}
      gutter={sideOffset()}
      shift={alignOffset()}
      getAnchorRect={(defaultAnchor) =>
        (resolveAnchor(anchor()) ?? defaultAnchor)?.getBoundingClientRect()
      }
    >
      <ComboboxAdapterContext.Provider value={adapter}>
        <ComboboxStateBridge />
        {local.children}
        <ComboboxFormControl
          autoComplete={local.autoComplete}
          disabled={local.disabled}
          form={local.form}
          id={local.id}
          inputRef={local.inputRef}
          items={allItems()}
          multiple={local.multiple ?? false}
          name={local.name}
          readOnly={local.readOnly}
          required={local.required}
          selectedValue={effectiveValue()}
        />
      </ComboboxAdapterContext.Provider>
    </ComboboxPrimitive.Root>
  );
};

type ComboboxValueProps = {
  children?: JSX.Element | ((selectedValue: unknown | unknown[] | null) => JSX.Element);
  placeholder?: JSX.Element;
};

const ComboboxValue = (props: ComboboxValueProps) => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  const resolved = createMemo(() => {
    const selected = state.selectedOptions();
    const value = state.isMultiple() ? selected : (selected[0] ?? null);

    if (typeof props.children === "function") {
      return props.children(value);
    }

    if (props.children !== undefined) {
      return props.children;
    }

    if (selected.length === 0) {
      return props.placeholder;
    }

    return state.isMultiple()
      ? selected.map((item) => adapter.itemToStringLabel(item)).join(", ")
      : adapter.itemToStringLabel(selected[0]);
  });

  return <>{resolved()}</>;
};

type ComboboxTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ComboboxPrimitiveTriggerProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const ComboboxTrigger = <T extends ValidComponent = "button">(props: ComboboxTriggerProps<T>) => {
  const adapter = useComboboxAdapterContext();
  const [local, others] = splitProps(props as ComboboxTriggerProps, [
    "class",
    "children",
    "onClick",
    "onKeyDown",
    "onPointerDown",
  ]);
  adapter.registerStandaloneTrigger();

  return (
    <ComboboxPrimitive.Control>
      <ComboboxPrimitive.Trigger
        class={cn("z-combobox-trigger", local.class)}
        data-slot="combobox-trigger"
        {...others}
        onPointerDown={(event) => {
          adapter.setChangeDetails("trigger-press", event, event.currentTarget);
          callEventHandler(local.onPointerDown, event);
        }}
        onKeyDown={(event: KeyboardEvent & { currentTarget: HTMLElement; target: Element }) => {
          adapter.setChangeDetails("trigger-press", event, event.currentTarget);
          callEventHandler(local.onKeyDown, event);
        }}
        onClick={(event) => {
          adapter.setChangeDetails("trigger-press", event, event.currentTarget);
          callEventHandler(local.onClick, event);
        }}
      >
        {local.children}
        <ChevronDown class="pointer-events-none z-combobox-trigger-icon" />
      </ComboboxPrimitive.Trigger>
    </ComboboxPrimitive.Control>
  );
};

type ComboboxClearProps = ComponentProps<typeof InputGroupButton> & {
  keepMounted?: boolean;
};

const ComboboxClear = (props: ComboboxClearProps) => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "disabled",
    "keepMounted",
    "onClick",
    "onPointerDown",
  ]);
  const visible = () => state.selectedOptions().length > 0 || Boolean(state.inputValue());

  return (
    <Show when={visible() || local.keepMounted}>
      <InputGroupButton
        variant="ghost"
        size="icon-xs"
        data-slot="combobox-clear"
        data-visible={visible() ? "" : undefined}
        aria-label="Clear"
        class={cn("z-combobox-clear", local.class)}
        disabled={local.disabled || adapter.disabled() || adapter.readOnly()}
        onPointerDown={(event) => {
          adapter.setChangeDetails("clear-press", event, event.currentTarget);
          callEventHandler(local.onPointerDown, event);
          event.preventDefault();
        }}
        onClick={(event) => {
          adapter.setChangeDetails("clear-press", event, event.currentTarget);
          callEventHandler(local.onClick, event);

          if (event.defaultPrevented) {
            return;
          }

          if (adapter.disabled() || adapter.readOnly()) {
            return;
          }

          state.listState().selectionManager().clearSelection();
          state.setInputValue("");
          state.inputRef()?.focus();
        }}
        {...others}
      >
        {local.children ?? <X class="pointer-events-none z-combobox-clear-icon" />}
      </InputGroupButton>
    </Show>
  );
};

type ComboboxInputProps<T extends ValidComponent = "input"> = PolymorphicProps<
  T,
  ComboboxPrimitiveInputProps<T>
> &
  Pick<ComponentProps<"input">, "class" | "placeholder" | "disabled" | "id" | "name"> & {
    children?: JSX.Element;
    showClear?: boolean;
    showTrigger?: boolean;
  };

const ComboboxInput = <T extends ValidComponent = "input">(rawProps: ComboboxInputProps<T>) => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  const props = mergeProps({ disabled: false, showClear: false, showTrigger: true }, rawProps);
  const [local, others] = splitProps(props as ComboboxInputProps, [
    "children",
    "class",
    "disabled",
    "onBlur",
    "onClick",
    "onInput",
    "onKeyDown",
    "ref",
    "showClear",
    "showTrigger",
  ]);

  const handleTriggerPointerDown: JSX.EventHandlerUnion<HTMLElement, PointerEvent> = (event) => {
    adapter.setChangeDetails("trigger-press", event, event.currentTarget);
  };

  const handleTriggerKeyDown: JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> = (event) => {
    adapter.setChangeDetails("trigger-press", event, event.currentTarget);
  };

  const handleTriggerClick: JSX.EventHandlerUnion<HTMLElement, MouseEvent> = (event) => {
    adapter.setChangeDetails("trigger-press", event, event.currentTarget);
  };

  const input = () => (
    <>
      <ComboboxPrimitive.Input
        as={InputGroupInput}
        {...others}
        ref={(element) => {
          setExternalRef(local.ref as ComboboxExternalRef<HTMLInputElement>, element);
        }}
        form={others.form ?? adapter.form()}
        required={undefined}
        aria-label={
          others["aria-label"] ??
          (others["aria-labelledby"] ? undefined : (others.placeholder as string | undefined))
        }
        aria-required={adapter.required() || undefined}
        aria-haspopup={adapter.inline() ? undefined : adapter.grid() ? "grid" : "listbox"}
        aria-expanded={adapter.inline() ? undefined : state.isOpen()}
        disabled={local.disabled}
        onClick={(event) => {
          adapter.setChangeDetails("trigger-press", event, event.currentTarget);
          callEventHandler(local.onClick, event);

          if (
            !event.defaultPrevented &&
            adapter.openOnInputClick() &&
            !adapter.disabled() &&
            !adapter.readOnly() &&
            !state.isOpen()
          ) {
            state.open(false, "input");
          }
        }}
        onInput={(event) => {
          adapter.setChangeDetails("input-change", event, event.currentTarget);
          callEventHandler(local.onInput, event);
        }}
        onBlur={(event) => {
          adapter.setChangeDetails("focus-out", event, event.currentTarget);
          callEventHandler(local.onBlur, event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            adapter.setChangeDetails("escape-key", event, event.currentTarget);
          } else if (
            event.key === "Enter" &&
            state.isOpen() &&
            state.listState().selectionManager().focusedKey()
          ) {
            adapter.setChangeDetails("item-press", event, event.currentTarget);
          } else if (event.key.startsWith("Arrow")) {
            adapter.setChangeDetails("list-navigation", event, event.currentTarget);
            adapter.setHighlightDetails("keyboard", event);
          }

          callEventHandler(local.onKeyDown, event);
          moveComboboxGridHighlight(adapter, state, event);

          if (!event.defaultPrevented && adapter.loopFocus() && state.isOpen()) {
            const manager = state.listState().selectionManager();
            const items = [...state.listState().collection()].filter(
              (node) => node.type === "item" && !node.disabled,
            );
            const edgeKey = event.key === "ArrowDown" ? items.at(-1)?.key : items[0]?.key;

            if (
              (event.key === "ArrowDown" || event.key === "ArrowUp") &&
              manager.focusedKey() === edgeKey
            ) {
              queueMicrotask(() => {
                if (manager.focusedKey() === edgeKey) {
                  manager.setFocusedKey(undefined);
                }
              });
            }
          }
        }}
      />
      <InputGroupAddon align="inline-end">
        <Show when={local.showTrigger}>
          <ComboboxPrimitive.Trigger
            as={InputGroupButton}
            size="icon-xs"
            variant="ghost"
            data-slot="input-group-button"
            class="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={local.disabled}
            onPointerDown={handleTriggerPointerDown}
            onKeyDown={handleTriggerKeyDown}
            onClick={handleTriggerClick}
          >
            <ChevronDown class="pointer-events-none z-combobox-trigger-icon" />
          </ComboboxPrimitive.Trigger>
        </Show>
        <Show when={local.showClear}>
          <ComboboxClear disabled={local.disabled} />
        </Show>
      </InputGroupAddon>
      {local.children}
    </>
  );

  if (!adapter.hasStandaloneTrigger()) {
    return (
      <ComboboxPrimitive.Control as={InputGroup} class={cn("z-combobox-input w-auto", local.class)}>
        {input()}
      </ComboboxPrimitive.Control>
    );
  }

  return <InputGroup class={cn("z-combobox-input w-auto", local.class)}>{input()}</InputGroup>;
};

type ComboboxContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ComboboxPrimitiveContentProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    align?: ComboboxAlign;
    alignOffset?: number;
    anchor?: ComboboxAnchorValue;
    finalFocus?: ComboboxFocusTarget;
    initialFocus?: ComboboxFocusTarget;
    onEscapeKeyDown?: (event: Event) => void;
    side?: ComboboxSide;
    sideOffset?: number;
  };

const ComboboxContent = <T extends ValidComponent = "div">(rawProps: ComboboxContentProps<T>) => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  const props = mergeProps(
    { align: "start", alignOffset: 0, side: "bottom", sideOffset: 6 } as const,
    rawProps,
  );
  const [local, others] = splitProps(props as ComboboxContentProps, [
    "as",
    "align",
    "alignOffset",
    "anchor",
    "children",
    "class",
    "finalFocus",
    "initialFocus",
    "onCloseAutoFocus",
    "onEscapeKeyDown",
    "onFocusOutside",
    "onPointerDownOutside",
    "ref",
    "side",
    "sideOffset",
  ]);
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  let appliedInitialFocus = false;
  let previouslyFocused: HTMLElement | null = null;
  let previousOpen = false;
  let completionVersion = 0;
  const empty = () => state.listState().collection().getSize() === 0;
  const inputInsidePopup = () => {
    const element = contentRef();
    const input = state.inputRef();
    return Boolean(element && input && element.contains(input));
  };
  const contentClass = () =>
    cn(
      "z-combobox-content z-combobox-content-logical z-menu-target z-menu-translucent group/combobox-content relative isolate z-50 max-h-(--kb-popper-content-available-height) w-(--kb-popper-anchor-width) max-w-(--kb-popper-content-available-width) min-w-[calc(var(--kb-popper-anchor-width)+--spacing(7))] origin-(--kb-combobox-content-transform-origin) overflow-hidden data-[chips=true]:min-w-(--kb-popper-anchor-width)",
      local.class,
    );
  const renderedSide = () => {
    const actualSide = adapter.currentPlacement().split("-")[0];

    if (local.side === "inline-start" || local.side === "inline-end") {
      const requestedPhysicalSide = local.side === "inline-start" ? "left" : "right";
      return actualSide === requestedPhysicalSide ? local.side : actualSide;
    }

    return actualSide;
  };

  createEffect(() => {
    adapter.setContentPosition({
      align: local.align ?? "start",
      alignOffset: local.alignOffset ?? 0,
      anchor: local.anchor,
      side: local.side ?? "bottom",
      sideOffset: local.sideOffset ?? 6,
    });
  });

  createEffect(() => {
    adapter.setInputInsidePopup(inputInsidePopup());
  });

  createEffect(() => {
    const nextOpen = state.isOpen();

    if (nextOpen === previousOpen) {
      return;
    }

    previousOpen = nextOpen;
    const version = ++completionVersion;
    queueMicrotask(async () => {
      const element = contentRef();
      const animations =
        element && "getAnimations" in element
          ? element.getAnimations().filter((animation) => animation.playState !== "finished")
          : [];

      if (animations.length > 0) {
        await Promise.allSettled(animations.map((animation) => animation.finished));
      }

      if (version === completionVersion) {
        adapter.completeOpenChange(nextOpen);
      }
    });
  });

  createEffect(() => {
    if (!state.isOpen()) {
      appliedInitialFocus = false;
      return;
    }

    const element = contentRef();

    if (adapter.inline() || appliedInitialFocus || !element) {
      return;
    }

    appliedInitialFocus = true;
    queueMicrotask(() => {
      previouslyFocused = document.activeElement as HTMLElement | null;
      const target =
        local.initialFocus === undefined
          ? inputInsidePopup()
            ? adapter.interactionType() === "touch"
              ? element
              : true
            : false
          : resolveFocusTarget(local.initialFocus, adapter.interactionType());

      if (target === true) {
        const firstFocusable = element.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        (firstFocusable ?? element).focus();
      } else if (target instanceof HTMLElement) {
        target.focus();
      }
    });
  });

  onCleanup(() => {
    completionVersion += 1;
    adapter.setInputInsidePopup(false);
  });

  const setElement = (element: HTMLElement) => {
    setContentRef(element);
    state.setContentRef(element);
    setExternalRef(local.ref as ComboboxExternalRef<HTMLElement>, element);
  };

  const content = () => (
    <ComboboxPrimitive.Content
      as={local.as}
      {...others}
      ref={setElement}
      class={contentClass()}
      role={inputInsidePopup() ? "dialog" : "presentation"}
      data-slot="combobox-content"
      data-chips={local.anchor ? "true" : undefined}
      data-empty={empty() ? "" : undefined}
      data-side={renderedSide()}
      data-align={adapter.currentPlacement().split("-")[1] ?? "center"}
      tabIndex={-1}
      onPointerDownOutside={(event) => {
        const nativeEvent = getNativeEvent(event);
        adapter.setChangeDetails("outside-press", nativeEvent);
        callEventHandler(local.onPointerDownOutside, event);
      }}
      onFocusOutside={(event) => {
        const nativeEvent = getNativeEvent(event);
        adapter.setChangeDetails("focus-out", nativeEvent);
        callEventHandler(local.onFocusOutside, event);
      }}
      onEscapeKeyDown={(event: Event) => {
        const nativeEvent = getNativeEvent(event);
        adapter.setChangeDetails("escape-key", nativeEvent);
        callEventHandler(local.onEscapeKeyDown, event);
      }}
      onCloseAutoFocus={(event) => {
        callEventHandler(local.onCloseAutoFocus, event);

        if (event.defaultPrevented) {
          return;
        }

        if (local.finalFocus === undefined && !inputInsidePopup()) {
          event.preventDefault();
          return;
        }

        const target =
          local.finalFocus === undefined
            ? true
            : resolveFocusTarget(local.finalFocus, adapter.interactionType());

        if (target === false || target === undefined || target === null) {
          event.preventDefault();
        } else if (target === true) {
          event.preventDefault();
          (state.triggerRef() ?? previouslyFocused)?.focus();
        } else if (target instanceof HTMLElement) {
          event.preventDefault();
          target.focus();
        }
      }}
    >
      {local.children}
    </ComboboxPrimitive.Content>
  );

  const inlineContent = () => (
    <div
      {...(others as ComponentProps<"div">)}
      ref={setElement}
      class={contentClass()}
      data-slot="combobox-content"
      data-chips={local.anchor ? "true" : undefined}
      data-empty={empty() ? "" : undefined}
      data-side={renderedSide()}
      data-align={adapter.currentPlacement().split("-")[1] ?? "center"}
      data-expanded={state.isOpen() ? "" : undefined}
      data-closed={state.isOpen() ? undefined : ""}
      tabIndex={-1}
    >
      {local.children}
    </div>
  );

  return (
    <Show when={!adapter.forceUnmounted()}>
      <Show
        when={adapter.inline()}
        fallback={<ComboboxPrimitive.Portal>{content()}</ComboboxPrimitive.Portal>}
      >
        {inlineContent()}
      </Show>
    </Show>
  );
};

type ComboboxListProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, ComboboxPrimitiveListProps<unknown, unknown, T>>,
  "children"
> & {
  // biome-ignore lint/suspicious/noExplicitAny: Base UI intentionally leaves collection item data generic at this part boundary
  children?: JSX.Element | ((item: any, index: number) => JSX.Element);
  class?: string;
};

type ComboboxRenderEntry = {
  children: CollectionNode[];
  node: CollectionNode;
};

const ComboboxGridRow = (props: { children?: JSX.Element }) => {
  const adapter = useComboboxAdapterContext();

  return (
    <Show when={adapter.grid()} fallback={props.children}>
      {/* biome-ignore lint/a11y/useSemanticElements: Base UI grid rows are divs, not table rows */}
      {/* biome-ignore lint/a11y/useFocusableInteractive: virtual focus remains on the combobox input */}
      <div role="row">{props.children}</div>
    </Show>
  );
};

const createRenderEntries = (nodes: CollectionNode[]) => {
  const entries: ComboboxRenderEntry[] = [];

  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];

    if (node.type === "item") {
      entries.push({ children: [], node });
      continue;
    }

    const children: CollectionNode[] = [];
    let childIndex = index + 1;

    while (childIndex < nodes.length && nodes[childIndex].level > node.level) {
      if (nodes[childIndex].type === "item") {
        children.push(nodes[childIndex]);
      }
      childIndex++;
    }

    entries.push({ children, node });
    index = childIndex - 1;
  }

  return entries;
};

const ComboboxList = <T extends ValidComponent = "div">(rawProps: ComboboxListProps<T>) => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  const [local, others] = splitProps(rawProps as ComboboxListProps, [
    "children",
    "class",
    "onPointerLeave",
    "ref",
  ]);
  let listRef: HTMLElement | undefined;

  const renderCollection = (collection: Accessor<Collection<CollectionNode>>) => {
    const nodes = createMemo(() => [...collection()]);

    if (typeof local.children === "function") {
      const entries = createMemo(() => createRenderEntries(nodes()));

      return (
        <For each={entries()}>
          {(entry, index) => (
            <Show
              when={entry.node.type === "section"}
              fallback={
                <ComboboxGridRow>
                  <ComboboxItemNodeContext.Provider value={entry.node}>
                    {/* biome-ignore lint/suspicious/noExplicitAny: matches Base UI's untyped collection render callback */}
                    {(local.children as (item: any, index: number) => JSX.Element)(
                      entry.node.rawValue,
                      index(),
                    )}
                  </ComboboxItemNodeContext.Provider>
                </ComboboxGridRow>
              }
            >
              <ComboboxGroupCollectionContext.Provider value={{ items: entry.children }}>
                {/* biome-ignore lint/suspicious/noExplicitAny: matches Base UI's untyped collection render callback */}
                {(local.children as (item: any, index: number) => JSX.Element)(
                  entry.node.rawValue,
                  index(),
                )}
              </ComboboxGroupCollectionContext.Provider>
            </Show>
          )}
        </For>
      );
    }

    if (local.children !== undefined) {
      return local.children;
    }

    return null;
  };

  return (
    <ComboboxPrimitive.Listbox
      as="div"
      {...others}
      ref={(element) => {
        listRef = element;

        if (typeof local.ref === "function") {
          local.ref(element);
        }
      }}
      data-slot="combobox-list"
      data-empty={state.listState().collection().getSize() === 0 ? "" : undefined}
      data-virtualized={adapter.externallyVirtualized() ? "" : undefined}
      role={adapter.grid() ? "grid" : "listbox"}
      class={cn("z-combobox-list overflow-y-auto overscroll-contain", local.class)}
      onPointerLeave={(
        event: PointerEvent & { currentTarget: HTMLDivElement; target: Element },
      ) => {
        adapter.setHighlightDetails("pointer", event);
        callEventHandler(local.onPointerLeave, event);

        if (!event.defaultPrevented && !adapter.keepHighlight()) {
          state.listState().selectionManager().setFocusedKey(undefined);
        }
      }}
      scrollToItem={(key) => {
        if (adapter.externallyVirtualized()) {
          return;
        }

        const item = [...(listRef?.querySelectorAll<HTMLElement>("[data-key]") ?? [])].find(
          (element) => element.dataset.key === key,
        );
        item?.scrollIntoView({ block: "nearest" });
      }}
    >
      {renderCollection}
    </ComboboxPrimitive.Listbox>
  );
};

type ComboboxItemProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, ComboboxPrimitiveItemProps<T>>,
  "item"
> & {
  children?: JSX.Element;
  class?: string;
  disabled?: boolean;
  index?: number;
  value?: unknown;
};

const ComboboxItem = <T extends ValidComponent = "div">(props: ComboboxItemProps<T>) => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  const contextItem = useContext(ComboboxItemNodeContext);
  const [local, others] = splitProps(props as ComboboxItemProps, [
    "children",
    "class",
    "disabled",
    "index",
    "onClick",
    "onKeyDown",
    "onPointerDown",
    "onPointerMove",
    "value",
  ]);
  const item = createMemo<CollectionNode>(() => {
    const source = contextItem;

    if (source) {
      return local.disabled === undefined ? source : { ...source, disabled: local.disabled };
    }

    return {
      disabled: local.disabled ?? false,
      index: local.index ?? 0,
      key: adapter.itemToStringValue(local.value),
      level: 0,
      rawValue: local.value,
      textValue: adapter.itemToStringLabel(local.value),
      type: "item",
    };
  });
  let unregisterItem: (() => void) | undefined;

  onMount(() => {
    const value = contextItem?.rawValue ?? local.value;

    if (value !== undefined) {
      unregisterItem = adapter.registerItem(value);
    }
  });

  onCleanup(() => {
    if (adapter.open()) {
      unregisterItem?.();
    }
  });

  return (
    <ComboboxPrimitive.Item
      as="div"
      item={item()}
      class={cn(
        "z-combobox-item relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        local.class,
      )}
      data-slot="combobox-item"
      {...others}
      role={adapter.grid() ? "gridcell" : "option"}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") {
          adapter.setHighlightDetails("pointer", event);
        }
        callEventHandler(local.onPointerMove, event);
      }}
      onPointerDown={(event) => {
        adapter.setChangeDetails("item-press", event, event.currentTarget);
        callEventHandler(local.onPointerDown, event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          adapter.setChangeDetails("item-press", event, event.currentTarget);
        } else if (event.key.startsWith("Arrow")) {
          adapter.setHighlightDetails("keyboard", event);
        }
        callEventHandler(local.onKeyDown, event);
      }}
      onClick={(event) => {
        adapter.setChangeDetails("item-press", event, event.currentTarget);
        callEventHandler(local.onClick, event);

        if (!event.defaultPrevented && adapter.submitOnItemClick()) {
          queueMicrotask(() => state.inputRef()?.form?.requestSubmit());
        }
      }}
    >
      {local.children}
      <ComboboxPrimitive.ItemIndicator as="span" class="z-combobox-item-indicator">
        <Check class="pointer-events-none z-combobox-item-indicator-icon" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
};

type ComboboxGroupProps = ComponentProps<"div"> & {
  items?: readonly unknown[];
};

const ComboboxGroup = (props: ComboboxGroupProps) => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  const inheritedItems = useContext(ComboboxGroupCollectionContext);
  const [local, others] = splitProps(props, ["children", "class", "items"]);
  const [labelId, setLabelId] = createSignal<string>();
  const collectionItems = createMemo(() => {
    if (local.items === undefined) {
      return inheritedItems?.items ?? [];
    }

    const nodes = [...state.listState().collection()].filter((node) => node.type === "item");
    return (local.items ?? []).map((item, index) => {
      const node = nodes.find((candidate) => adapter.isItemEqualToValue(candidate.rawValue, item));
      return (
        node ?? {
          disabled: false,
          index,
          key: adapter.itemToStringValue(item),
          level: 0,
          rawValue: item,
          textValue: adapter.itemToStringLabel(item),
          type: "item" as const,
        }
      );
    });
  });

  return (
    <ComboboxGroupCollectionContext.Provider
      value={{
        get items() {
          return collectionItems();
        },
      }}
    >
      <ComboboxGroupLabelContext.Provider value={{ labelId, setLabelId }}>
        {/* biome-ignore lint/a11y/useSemanticElements: role="group" matches the pinned Base UI combobox contract */}
        <div
          role="group"
          aria-labelledby={labelId()}
          data-slot="combobox-group"
          class={cn("z-combobox-group", local.class)}
          {...others}
        >
          {local.children}
        </div>
      </ComboboxGroupLabelContext.Provider>
    </ComboboxGroupCollectionContext.Provider>
  );
};

type ComboboxLabelProps = ComponentProps<"div">;

const ComboboxLabel = (props: ComboboxLabelProps) => {
  const group = useContext(ComboboxGroupLabelContext);
  const generatedId = `combobox-label-${createUniqueId()}`;
  const [local, others] = splitProps(props, ["class", "id"]);
  const id = () => local.id ?? generatedId;

  onMount(() => group?.setLabelId(id()));
  onCleanup(() => group?.setLabelId(undefined));

  return (
    <div
      id={id()}
      data-slot="combobox-label"
      class={cn("z-combobox-label", local.class)}
      {...others}
    />
  );
};

type ComboboxCollectionProps = {
  // biome-ignore lint/suspicious/noExplicitAny: Base UI intentionally leaves collection item data generic at this part boundary
  children: (item: any, index: number) => JSX.Element;
};

const ComboboxCollection = (props: ComboboxCollectionProps) => {
  const group = useContext(ComboboxGroupCollectionContext);
  const state = ComboboxPrimitive.useComboboxContext();
  const items = createMemo(() =>
    group
      ? group.items
      : [...state.listState().collection()].filter((node) => node.type === "item"),
  );

  return (
    <For each={items()}>
      {(item, index) => (
        <ComboboxGridRow>
          <ComboboxItemNodeContext.Provider value={item}>
            {props.children(item.rawValue, index())}
          </ComboboxItemNodeContext.Provider>
        </ComboboxGridRow>
      )}
    </For>
  );
};

type ComboboxEmptyProps = ComponentProps<"div">;

const ComboboxEmpty = (props: ComboboxEmptyProps) => {
  const state = ComboboxPrimitive.useComboboxContext();
  const [local, others] = splitProps(props, ["children", "class"]);
  const empty = () => state.listState().collection().getSize() === 0;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class={cn("z-combobox-empty", local.class)}
      data-slot="combobox-empty"
      {...others}
    >
      {empty() ? local.children : null}
    </div>
  );
};

type ComboboxSeparatorProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SeparatorRootProps<T>
> & {
  class?: string;
};

const ComboboxSeparator = <T extends ValidComponent = "div">(props: ComboboxSeparatorProps<T>) => {
  const [local, others] = splitProps(props as ComboboxSeparatorProps, ["class"]);

  return (
    <SeparatorPrimitive.Root
      data-slot="combobox-separator"
      class={cn("z-combobox-separator", local.class)}
      {...others}
    />
  );
};

type ComboboxChipsProps = ComponentProps<"div">;

const ComboboxChips = (props: ComboboxChipsProps) => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  const [local, others] = splitProps(props, ["class", "onMouseDown"]);

  return (
    <ComboboxPrimitive.Control
      as="div"
      role={state.selectedOptions().length > 0 ? "toolbar" : undefined}
      data-slot="combobox-chips"
      class={cn("z-combobox-chips", local.class)}
      onMouseDown={(event: MouseEvent & { currentTarget: HTMLDivElement; target: Element }) => {
        callEventHandler(local.onMouseDown, event);

        if (
          !event.defaultPrevented &&
          !adapter.disabled() &&
          !adapter.readOnly() &&
          !(event.target as HTMLElement).closest("button")
        ) {
          event.preventDefault();
          state.inputRef()?.focus();
        }
      }}
      {...others}
    />
  );
};

type ComboboxChipProps = ComponentProps<"div"> & {
  showRemove?: boolean;
};

const ComboboxChip = (rawProps: ComboboxChipProps) => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  const props = mergeProps({ showRemove: true }, rawProps);
  const [local, others] = splitProps(props, ["children", "class", "onKeyDown", "showRemove"]);

  const remove = (chip: HTMLElement, event: Event, reason: "chip-remove-press" | "none") => {
    adapter.setChangeDetails(reason, event, chip);
    const chips = [
      ...(chip.parentElement?.querySelectorAll<HTMLElement>("[data-slot=combobox-chip]") ?? []),
    ];
    const index = chips.indexOf(chip);
    const option = state.selectedOptions()[index];

    if (option === undefined) {
      return;
    }

    state.removeOptionFromSelection(option);
    queueMicrotask(() => {
      const remaining = [
        ...(chip.parentElement?.querySelectorAll<HTMLElement>("[data-slot=combobox-chip]") ?? []),
      ];
      remaining[Math.min(index, remaining.length - 1)]?.focus() ?? state.inputRef()?.focus();
    });
  };

  const disabled = () => adapter.disabled();
  const readOnly = () => adapter.readOnly();

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: keyboard interaction matches the pinned Base UI chip contract
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-readonly matches the pinned Base UI chip contract
    <div
      tabIndex={-1}
      aria-disabled={disabled() || undefined}
      aria-readonly={readOnly() || undefined}
      data-slot="combobox-chip"
      class={cn(
        "z-combobox-chip has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50",
        local.class,
      )}
      onKeyDown={(event: KeyboardEvent & { currentTarget: HTMLDivElement; target: Element }) => {
        callEventHandler(local.onKeyDown, event);

        if (event.defaultPrevented || disabled() || readOnly()) {
          return;
        }

        const chips = [
          ...(event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
            "[data-slot=combobox-chip]",
          ) ?? []),
        ];
        const index = chips.indexOf(event.currentTarget);

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          chips[index - 1]?.focus() ?? state.inputRef()?.focus();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          chips[index + 1]?.focus() ?? state.inputRef()?.focus();
        } else if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          remove(event.currentTarget, event, "none");
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          adapter.setChangeDetails("list-navigation", event, event.currentTarget);
          adapter.setHighlightDetails("keyboard", event);
          state.open(event.key === "ArrowDown" ? "first" : "last", "manual");
          state.inputRef()?.focus();
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          state.inputRef()?.focus();
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          state.inputRef()?.focus();
        }
      }}
      {...others}
    >
      {local.children}
      <Show when={local.showRemove}>
        <Button
          variant="ghost"
          size="icon-xs"
          class="z-combobox-chip-remove"
          data-slot="combobox-chip-remove"
          aria-label="Remove"
          disabled={disabled() || readOnly()}
          onPointerDown={(event) => event.preventDefault()}
          onClick={(event) =>
            remove(event.currentTarget.parentElement as HTMLElement, event, "chip-remove-press")
          }
        >
          <X class="pointer-events-none z-combobox-chip-indicator-icon" />
        </Button>
      </Show>
    </div>
  );
};

type ComboboxChipsInputProps<T extends ValidComponent = "input"> = PolymorphicProps<
  T,
  ComboboxPrimitiveInputProps<T>
> &
  Pick<ComponentProps<"input">, "class" | "placeholder" | "disabled" | "id" | "name">;

const ComboboxChipsInput = <T extends ValidComponent = "input">(
  props: ComboboxChipsInputProps<T>,
) => {
  const adapter = useComboboxAdapterContext();
  const state = ComboboxPrimitive.useComboboxContext();
  const [local, others] = splitProps(props as ComboboxChipsInputProps, [
    "class",
    "onBlur",
    "onClick",
    "onInput",
    "onKeyDown",
    "ref",
  ]);

  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      class={cn("z-combobox-chip-input min-w-16 flex-1 outline-none", local.class)}
      ref={(element) => {
        setExternalRef(local.ref as ComboboxExternalRef<HTMLInputElement>, element);
      }}
      form={others.form ?? adapter.form()}
      required={undefined}
      aria-label={
        others["aria-label"] ??
        (others["aria-labelledby"] ? undefined : (others.placeholder ?? "Add item"))
      }
      aria-required={adapter.required() || undefined}
      aria-haspopup={adapter.inline() ? undefined : adapter.grid() ? "grid" : "listbox"}
      aria-expanded={adapter.inline() ? undefined : state.isOpen()}
      onClick={(event) => {
        adapter.setChangeDetails("trigger-press", event, event.currentTarget);
        callEventHandler(local.onClick, event);

        if (
          !event.defaultPrevented &&
          adapter.openOnInputClick() &&
          !adapter.disabled() &&
          !adapter.readOnly() &&
          !state.isOpen()
        ) {
          state.open(false, "input");
        }
      }}
      onInput={(event) => {
        adapter.setChangeDetails("input-change", event, event.currentTarget);
        callEventHandler(local.onInput, event);
      }}
      onBlur={(event) => {
        adapter.setChangeDetails("focus-out", event, event.currentTarget);
        callEventHandler(local.onBlur, event);
      }}
      onKeyDown={(event: KeyboardEvent & { currentTarget: HTMLInputElement; target: Element }) => {
        if (event.key === "Escape") {
          adapter.setChangeDetails("escape-key", event, event.currentTarget);
        } else if (
          event.key === "Enter" &&
          state.isOpen() &&
          state.listState().selectionManager().focusedKey()
        ) {
          adapter.setChangeDetails("item-press", event, event.currentTarget);
        } else if (event.key.startsWith("Arrow")) {
          adapter.setChangeDetails("list-navigation", event, event.currentTarget);
          adapter.setHighlightDetails("keyboard", event);
        } else if (event.key === "Backspace" && event.currentTarget.value === "") {
          adapter.setChangeDetails("none", event, event.currentTarget);
        }

        callEventHandler(local.onKeyDown, event);
        moveComboboxGridHighlight(adapter, state, event);

        if (
          !event.defaultPrevented &&
          event.key === "ArrowLeft" &&
          event.currentTarget.selectionStart === 0
        ) {
          event.preventDefault();
          const chips = event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
            "[data-slot=combobox-chip]",
          );
          chips?.[chips.length - 1]?.focus();
        }
      }}
      {...others}
    />
  );
};

function useComboboxAnchor(): ComboboxAnchor {
  let anchor: HTMLDivElement | undefined;

  return ((element?: HTMLDivElement) => {
    if (element) {
      anchor = element;
      return;
    }

    return anchor;
  }) as ComboboxAnchor;
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
};
