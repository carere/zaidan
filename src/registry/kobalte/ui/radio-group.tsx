import {
  type Accessor,
  type ComponentProps,
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  onMount,
  Show,
  splitProps,
  useContext,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";

// Kobalte is string-only and cannot expose Base UI's cancelable change, input-ref, and
// form contract; Corvu has no radio-group primitive, so the pinned behavior lives here.
type RadioGroupChangeDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: "none";
  trigger: Element | undefined;
};

function createChangeDetails(event?: Event): RadioGroupChangeDetails {
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
    reason: "none",
    trigger: undefined,
  };
}

function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

function serializeValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type RegisteredRadio = {
  activate: (event: Event) => void;
  checked: Accessor<boolean>;
  control: Accessor<HTMLElement | undefined>;
  disabled: Accessor<boolean>;
  input: Accessor<HTMLInputElement | undefined>;
};

type RadioGroupContextValue = {
  disabled: Accessor<boolean>;
  form: Accessor<string | undefined>;
  highlighted: Accessor<HTMLElement | undefined>;
  name: Accessor<string | undefined>;
  readOnly: Accessor<boolean>;
  register: (radio: RegisteredRadio) => () => void;
  required: Accessor<boolean>;
  selectedValue: Accessor<unknown>;
  select: (value: unknown, event: Event) => void;
  setHighlighted: (element: HTMLElement) => void;
};

const RadioGroupContext = createContext<RadioGroupContextValue>();

type RadioGroupProps<T extends ValidComponent = "div", Value = unknown> = Omit<
  ComponentProps<T>,
  "defaultValue" | "form" | "ref" | "value"
> & {
  as?: T;
  defaultValue?: Value;
  disabled?: boolean;
  form?: string;
  inputRef?: (element: HTMLInputElement | undefined) => void;
  name?: string;
  onValueChange?: (value: Value, details: RadioGroupChangeDetails) => void;
  readOnly?: boolean;
  ref?: (element: HTMLElement) => void;
  required?: boolean;
  value?: Value;
};

const RadioGroup = <T extends ValidComponent = "div", Value = unknown>(
  props: RadioGroupProps<T, Value>,
) => {
  const [local, others] = splitProps(props as RadioGroupProps, [
    "as",
    "aria-labelledby",
    "children",
    "class",
    "defaultValue",
    "disabled",
    "form",
    "inputRef",
    "name",
    "onBlur",
    "onFocus",
    "onKeyDown",
    "onValueChange",
    "readOnly",
    "ref",
    "required",
    "value",
  ]);
  const [uncontrolledValue, setUncontrolledValue] = createSignal<unknown>(local.defaultValue);
  const [highlighted, setHighlighted] = createSignal<HTMLElement>();
  const [registrationVersion, setRegistrationVersion] = createSignal(0);
  const [fallbackAriaLabelledBy, setFallbackAriaLabelledBy] = createSignal<string>();
  const fallbackLegendId = `radio-group-legend-${createUniqueId()}`;
  const radios = new Set<RegisteredRadio>();
  let groupElement: HTMLElement | undefined;
  let lastGroupInput: HTMLInputElement | undefined;

  const selectedValue = () => (local.value !== undefined ? local.value : uncontrolledValue());
  const orderedRadios = () => {
    registrationVersion();

    return [...radios].sort((a, b) => {
      const first = a.control();
      const second = b.control();
      if (!first || !second || first === second) return 0;

      const position = first.compareDocumentPosition(second);
      if (position & 4) return -1;
      if (position & 2) return 1;
      return 0;
    });
  };
  const syncInputs = () => {
    for (const radio of orderedRadios()) {
      const input = radio.input();
      if (input) input.checked = radio.checked();
    }
  };
  const select = (value: unknown, event: Event) => {
    if (value === selectedValue()) {
      syncInputs();
      return;
    }

    const details = createChangeDetails(event);
    local.onValueChange?.(value, details);

    if (!details.isCanceled && local.value === undefined) {
      setUncontrolledValue(value);
    }

    queueMicrotask(syncInputs);
  };
  const register = (radio: RegisteredRadio) => {
    radios.add(radio);
    setRegistrationVersion((version) => version + 1);

    const control = radio.control();
    const highlightedRadio = orderedRadios().find((item) => item.control() === highlighted());
    if (
      control &&
      (radio.checked() ||
        !highlightedRadio ||
        (!highlightedRadio.checked() && highlightedRadio.disabled() && !radio.disabled()))
    ) {
      setHighlighted(control);
    }

    return () => {
      radios.delete(radio);
      setRegistrationVersion((version) => version + 1);

      if (control && highlighted() === control) {
        const remaining = orderedRadios();
        setHighlighted(
          remaining.find((item) => item.checked())?.control() ??
            remaining.find((item) => !item.disabled())?.control() ??
            remaining[0]?.control(),
        );
      }
    };
  };
  const context: RadioGroupContextValue = {
    disabled: () => local.disabled ?? false,
    form: () => local.form,
    highlighted,
    name: () => local.name,
    readOnly: () => local.readOnly ?? false,
    register,
    required: () => local.required ?? false,
    selectedValue,
    select,
    setHighlighted,
  };

  createEffect(() => {
    selectedValue();
    const items = orderedRadios();
    syncInputs();

    const groupInput =
      items.find((radio) => radio.checked() && !radio.disabled())?.input() ??
      items.find((radio) => !radio.disabled())?.input();
    if (groupInput !== lastGroupInput) {
      lastGroupInput = groupInput;
      local.inputRef?.(groupInput);
    }
  });

  createEffect(() => {
    registrationVersion();
    const ownerDocument = groupElement?.ownerDocument;
    const form = local.form
      ? (ownerDocument?.getElementById(local.form) as HTMLFormElement | null)
      : (groupElement?.closest("form") ?? orderedRadios()[0]?.input()?.form);
    if (!form) return;

    const reset = () => {
      if (local.value === undefined) setUncontrolledValue(local.defaultValue);
      queueMicrotask(syncInputs);
    };
    form.addEventListener("reset", reset);
    onCleanup(() => form.removeEventListener("reset", reset));
  });

  onMount(() => {
    if (local["aria-labelledby"] || !groupElement) return;

    const legend = groupElement.closest("fieldset")?.querySelector(":scope > legend");
    if (!(legend instanceof HTMLElement)) return;
    if (!legend.id) legend.id = fallbackLegendId;
    setFallbackAriaLabelledBy(legend.id);
  });

  onCleanup(() => local.inputRef?.(undefined));

  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
    if (!["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)) return;

    const enabledRadios = orderedRadios().filter((radio) => !radio.disabled());
    if (enabledRadios.length === 0) return;

    const activeElement = groupElement?.ownerDocument.activeElement;
    const currentIndex = enabledRadios.findIndex((radio) => {
      const control = radio.control();
      return control === event.target || control === activeElement;
    });
    if (currentIndex === -1) return;

    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const nextIndex =
      (currentIndex + (forward ? 1 : -1) + enabledRadios.length) % enabledRadios.length;
    const nextRadio = enabledRadios[nextIndex];
    const nextControl = nextRadio?.control();
    if (!nextRadio || !nextControl || nextControl === activeElement) return;

    event.preventDefault();
    event.stopPropagation();
    setHighlighted(nextControl);
    queueMicrotask(() => {
      nextControl.focus();
      nextRadio.activate(event);
    });
  };

  return (
    <RadioGroupContext.Provider value={context}>
      <Dynamic
        component={local.as ?? "div"}
        ref={(element: HTMLElement) => {
          groupElement = element;
          local.ref?.(element);
        }}
        role="radiogroup"
        aria-disabled={local.disabled || undefined}
        aria-readonly={local.readOnly || undefined}
        aria-required={local.required || undefined}
        aria-labelledby={local["aria-labelledby"] ?? fallbackAriaLabelledBy()}
        data-disabled={local.disabled ? "" : undefined}
        data-readonly={local.readOnly ? "" : undefined}
        data-required={local.required ? "" : undefined}
        data-slot="radio-group"
        class={cn("z-radio-group w-full", local.class)}
        onBlur={(event: FocusEvent & { currentTarget: HTMLElement; target: Element }) =>
          callEventHandler(
            local.onBlur as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
            event,
          )
        }
        onFocus={(event: FocusEvent & { currentTarget: HTMLElement; target: Element }) =>
          callEventHandler(
            local.onFocus as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
            event,
          )
        }
        onKeyDown={handleKeyDown}
        {...others}
      >
        {local.children}
      </Dynamic>
    </RadioGroupContext.Provider>
  );
};

type RadioGroupItemProps<T extends ValidComponent = "span", Value = unknown> = Omit<
  ComponentProps<T>,
  "ref" | "value"
> & {
  as?: T;
  disabled?: boolean;
  inputRef?: (element: HTMLInputElement | undefined) => void;
  nativeButton?: boolean;
  readOnly?: boolean;
  ref?: (element: HTMLElement) => void;
  required?: boolean;
  value: Value;
};

const RadioGroupItem = <T extends ValidComponent = "span", Value = unknown>(
  props: RadioGroupItemProps<T, Value>,
) => {
  const group = useContext(RadioGroupContext);
  const [local, others] = splitProps(props as RadioGroupItemProps, [
    "as",
    "aria-invalid",
    "aria-labelledby",
    "children",
    "class",
    "disabled",
    "id",
    "inputRef",
    "nativeButton",
    "onBlur",
    "onClick",
    "onFocus",
    "onKeyDown",
    "onMouseDown",
    "onPointerDown",
    "readOnly",
    "ref",
    "required",
    "tabIndex",
    "value",
  ]);
  const rootId = `radio-${createUniqueId()}`;
  const [fallbackAriaLabelledBy, setFallbackAriaLabelledBy] = createSignal<string>();
  let control: HTMLElement | undefined;
  let input: HTMLInputElement | undefined;

  const checked = () => (group ? group.selectedValue() === local.value : local.value === "");
  const disabled = () => (group?.disabled() ?? false) || (local.disabled ?? false);
  const readOnly = () => (group?.readOnly() ?? false) || (local.readOnly ?? false);
  const required = () => (group?.required() ?? false) || (local.required ?? false);
  const nativeButton = () => local.nativeButton ?? false;
  const invalid = () => local["aria-invalid"] === true || local["aria-invalid"] === "true";
  const setInput = (element: HTMLInputElement) => {
    input = element;
    local.inputRef?.(element);
  };
  const activate = (sourceEvent: Event) => {
    if (!input || disabled() || readOnly()) return;

    const ownerWindow = input.ownerDocument.defaultView;
    const EventConstructor = ownerWindow?.PointerEvent ?? ownerWindow?.MouseEvent;
    if (!EventConstructor) return;
    const event = sourceEvent as MouseEvent;
    input.dispatchEvent(
      new EventConstructor("click", {
        altKey: event.altKey,
        bubbles: true,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      }),
    );
  };
  const registration: RegisteredRadio = {
    activate,
    checked,
    control: () => control,
    disabled,
    input: () => input,
  };

  createEffect(() => {
    if (input) input.checked = checked();
    if (nativeButton() && control instanceof HTMLButtonElement) {
      control.disabled = disabled();
    }
  });

  onMount(() => {
    if (group) {
      const unregister = group.register(registration);
      onCleanup(unregister);
    }

    if (local["aria-labelledby"] || !input) return;
    const label = input.labels?.[0];
    if (!label) return;
    if (!label.id) label.id = `${rootId}-label`;
    setFallbackAriaLabelledBy(label.id);
  });

  onCleanup(() => local.inputRef?.(undefined));

  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    if (disabled()) {
      event.preventDefault();
      return;
    }
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    if (event.defaultPrevented) return;
    if (readOnly()) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    group?.setHighlighted(event.currentTarget);
    activate(event);
  };
  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    if (disabled()) {
      if (event.key !== "Tab") event.preventDefault();
      return;
    }
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented) return;

    if (event.key === "Enter") {
      event.preventDefault();
      return;
    }
    if (event.key === " ") {
      handleClick(event as unknown as MouseEvent & { currentTarget: HTMLElement; target: Element });
    }
  };
  const handleInputClick: JSX.EventHandler<HTMLInputElement, MouseEvent> = (event) => {
    if (disabled() || readOnly()) {
      event.preventDefault();
      event.currentTarget.checked = checked();
      return;
    }
    if (!event.currentTarget.checked || checked()) {
      event.currentTarget.checked = checked();
      return;
    }

    if (group) {
      group.select(local.value, event);
    } else {
      queueMicrotask(() => {
        event.currentTarget.checked = checked();
      });
    }
  };

  return (
    <>
      <Dynamic
        component={local.as ?? "span"}
        ref={(element: HTMLElement) => {
          control = element;
          if (nativeButton()) {
            const button = element as HTMLButtonElement;
            button.type = "button";
            button.disabled = disabled();
          }
          local.ref?.(element);
        }}
        id={nativeButton() ? local.id : rootId}
        role="radio"
        aria-checked={checked()}
        aria-disabled={disabled() || undefined}
        aria-invalid={local["aria-invalid"]}
        aria-labelledby={local["aria-labelledby"] ?? fallbackAriaLabelledBy()}
        aria-readonly={readOnly() || undefined}
        aria-required={required() || undefined}
        tabIndex={
          local.tabIndex ??
          (group ? (group.highlighted() === control ? 0 : -1) : disabled() ? -1 : 0)
        }
        data-checked={checked() ? "" : undefined}
        data-unchecked={!checked() ? "" : undefined}
        data-disabled={disabled() ? "" : undefined}
        data-readonly={readOnly() ? "" : undefined}
        data-required={required() ? "" : undefined}
        data-invalid={invalid() ? "" : undefined}
        data-slot="radio-group-item"
        class={cn(
          "group/radio-group-item peer relative z-radio-group-item aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50 data-disabled:cursor-not-allowed data-disabled:opacity-50",
          local.class,
        )}
        onBlur={(event: FocusEvent & { currentTarget: HTMLElement; target: Element }) =>
          callEventHandler(
            local.onBlur as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
            event,
          )
        }
        onClick={handleClick}
        onFocus={(event: FocusEvent & { currentTarget: HTMLElement; target: Element }) => {
          callEventHandler(
            local.onFocus as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
            event,
          );
          if (!event.defaultPrevented) group?.setHighlighted(event.currentTarget);
        }}
        onKeyDown={handleKeyDown}
        onMouseDown={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
          if (disabled()) {
            event.preventDefault();
            return;
          }
          callEventHandler(
            local.onMouseDown as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
            event,
          );
        }}
        onPointerDown={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
          if (disabled()) {
            event.preventDefault();
            return;
          }
          callEventHandler(
            local.onPointerDown as JSX.EventHandlerUnion<HTMLElement, PointerEvent> | undefined,
            event,
          );
        }}
        {...others}
      >
        <Show when={checked()}>
          <span
            data-checked=""
            data-disabled={disabled() ? "" : undefined}
            data-readonly={readOnly() ? "" : undefined}
            data-required={required() ? "" : undefined}
            data-invalid={invalid() ? "" : undefined}
            data-slot="radio-group-indicator"
            class="z-radio-group-indicator"
          >
            <span class="z-radio-group-indicator-icon" />
          </span>
        </Show>
      </Dynamic>
      <input
        ref={setInput}
        type="radio"
        id={nativeButton() ? undefined : (local.id ?? `${rootId}-input`)}
        form={group?.form()}
        name={group?.name()}
        value={local.value === undefined ? undefined : serializeValue(local.value)}
        checked={checked()}
        disabled={disabled()}
        required={required()}
        readOnly={readOnly()}
        aria-hidden="true"
        tabIndex={-1}
        class="sr-only"
        onClick={handleInputClick}
        onFocus={() => control?.focus()}
      />
    </>
  );
};

export {
  RadioGroup,
  type RadioGroupChangeDetails,
  RadioGroupItem,
  type RadioGroupItemProps,
  type RadioGroupProps,
};
