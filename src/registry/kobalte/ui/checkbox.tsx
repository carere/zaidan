import { CheckIcon } from "lucide-solid";
import {
  type ComponentProps,
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  mergeProps,
  onCleanup,
  onMount,
  Show,
  splitProps,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";

type CheckboxChangeDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: "none";
  trigger: Element | undefined;
};

function createChangeDetails(event: Event): CheckboxChangeDetails {
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

function getDefaultFormSubmitter(form: HTMLFormElement | null): HTMLElement | null {
  return (
    form?.querySelector<HTMLElement>(
      'button:not([disabled]):not([type]), button[type="submit"]:not([disabled]), input[type="submit"]:not([disabled]), input[type="image"]:not([disabled])',
    ) ?? null
  );
}

type CheckboxProps<T extends ValidComponent = "span"> = Omit<
  ComponentProps<T>,
  "checked" | "defaultChecked" | "onChange" | "ref" | "value"
> & {
  as?: T;
  checked?: boolean;
  class?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  form?: string;
  id?: string;
  indeterminate?: boolean;
  inputRef?: (element: HTMLInputElement) => void;
  nativeButton?: boolean;
  name?: string;
  onCheckedChange?: (checked: boolean, details: CheckboxChangeDetails) => void;
  parent?: boolean;
  readOnly?: boolean;
  ref?: (element: HTMLElement) => void;
  required?: boolean;
  uncheckedValue?: string;
  value?: string;
};

const Checkbox = <T extends ValidComponent = "span">(props: CheckboxProps<T>) => {
  const mergedProps = mergeProps(
    {
      defaultChecked: false,
      disabled: false,
      indeterminate: false,
      nativeButton: false,
      parent: false,
      readOnly: false,
      required: false,
    },
    props,
  );
  const [local, others] = splitProps(mergedProps as CheckboxProps, [
    "as",
    "aria-labelledby",
    "checked",
    "children",
    "class",
    "defaultChecked",
    "disabled",
    "form",
    "id",
    "indeterminate",
    "inputRef",
    "nativeButton",
    "name",
    "onBlur",
    "onCheckedChange",
    "onClick",
    "onFocus",
    "onKeyDown",
    "onKeyUp",
    "parent",
    "readOnly",
    "ref",
    "required",
    "tabIndex",
    "uncheckedValue",
    "value",
  ]);
  const [uncontrolledChecked, setUncontrolledChecked] = createSignal(local.defaultChecked ?? false);
  const checked = (): boolean => local.checked ?? uncontrolledChecked();
  const indeterminate = (): boolean => local.indeterminate ?? false;
  const nativeButton = (): boolean =>
    Boolean(local.nativeButton && (local.as ?? "button") === "button");
  const rootId = `checkbox-${createUniqueId()}`;
  const [fallbackAriaLabelledBy, setFallbackAriaLabelledBy] = createSignal<string>();
  let control: HTMLElement | undefined;
  let ignoreEnterClick = false;
  let input: HTMLInputElement | undefined;

  const setInput = (element: HTMLInputElement) => {
    input = element;
    local.inputRef?.(element);
  };

  createEffect(() => {
    if (!input) return;
    input.checked = checked();
    input.indeterminate = indeterminate();
  });

  onMount(() => {
    if (!input || local["aria-labelledby"]) return;

    const parent = input.parentElement;
    const sibling = input.nextElementSibling;
    const label =
      (parent?.tagName === "LABEL" ? (parent as HTMLLabelElement) : undefined) ??
      (sibling instanceof HTMLLabelElement && sibling.htmlFor === input.id ? sibling : undefined) ??
      input.labels?.[0];

    if (!label) return;
    if (!label.id) label.id = `${rootId}-label`;
    setFallbackAriaLabelledBy(label.id);
  });

  createEffect(() => {
    const form = input?.form;
    if (!form) return;

    const reset = () => {
      if (local.checked === undefined) setUncontrolledChecked(local.defaultChecked ?? false);
    };
    form.addEventListener("reset", reset);
    onCleanup(() => form.removeEventListener("reset", reset));
  });

  const handleInputChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    if (local.readOnly) {
      event.preventDefault();
      event.currentTarget.checked = checked();
      return;
    }

    const nextChecked = event.currentTarget.checked;
    const details = createChangeDetails(event);
    local.onCheckedChange?.(nextChecked, details);
    if (details.isCanceled) {
      event.currentTarget.checked = checked();
      return;
    }

    if (local.checked === undefined) setUncontrolledChecked(nextChecked);
    else event.currentTarget.checked = checked();
  };

  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    if (ignoreEnterClick) {
      event.preventDefault();
      return;
    }
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || local.disabled || local.readOnly) return;

    event.preventDefault();
    if (!input) return;
    const PointerEventConstructor = input.ownerDocument.defaultView?.PointerEvent ?? MouseEvent;
    input.dispatchEvent(
      new PointerEventConstructor("click", {
        altKey: event.altKey,
        bubbles: true,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      }),
    );
  };

  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || local.disabled) return;
    if (event.key === " ") {
      event.preventDefault();
      return;
    }
    if (event.key === "Enter") {
      ignoreEnterClick = nativeButton();
      queueMicrotask(() => {
        ignoreEnterClick = false;
        if (!event.defaultPrevented) getDefaultFormSubmitter(input?.form ?? null)?.click();
      });
    }
  };

  const handleKeyUp: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    callEventHandler(
      local.onKeyUp as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || local.disabled || local.readOnly || event.key !== " ") return;

    event.preventDefault();
    input?.click();
  };

  return (
    <>
      <Dynamic
        component={local.as ?? (local.nativeButton ? "button" : "span")}
        ref={(element: HTMLElement) => {
          control = element;
          local.ref?.(element);
        }}
        id={nativeButton() ? local.id : rootId}
        type={nativeButton() ? "button" : undefined}
        disabled={nativeButton() && local.disabled ? true : undefined}
        role="checkbox"
        aria-checked={indeterminate() ? "mixed" : checked()}
        aria-disabled={!nativeButton() && local.disabled ? true : undefined}
        aria-labelledby={local["aria-labelledby"] ?? fallbackAriaLabelledBy()}
        aria-readonly={local.readOnly || undefined}
        aria-required={local.required || undefined}
        tabIndex={local.tabIndex ?? (local.disabled && !nativeButton() ? -1 : 0)}
        data-slot="checkbox"
        data-checked={!indeterminate() && checked() ? "" : undefined}
        data-unchecked={!indeterminate() && !checked() ? "" : undefined}
        data-indeterminate={indeterminate() ? "" : undefined}
        data-disabled={local.disabled ? "" : undefined}
        data-readonly={local.readOnly ? "" : undefined}
        data-required={local.required ? "" : undefined}
        data-parent={local.parent ? "" : undefined}
        class={cn(
          "z-checkbox peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50 data-disabled:cursor-not-allowed data-disabled:opacity-50",
          local.class,
        )}
        onBlur={(event: FocusEvent & { currentTarget: HTMLElement; target: Element }) =>
          callEventHandler(
            local.onBlur as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
            event,
          )
        }
        onClick={handleClick}
        onFocus={(event: FocusEvent & { currentTarget: HTMLElement; target: Element }) =>
          callEventHandler(
            local.onFocus as JSX.EventHandlerUnion<HTMLElement, FocusEvent> | undefined,
            event,
          )
        }
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        {...others}
      >
        <Show when={checked() || indeterminate()}>
          <span
            data-slot="checkbox-indicator"
            data-checked={!indeterminate() && checked() ? "" : undefined}
            data-indeterminate={indeterminate() ? "" : undefined}
            data-disabled={local.disabled ? "" : undefined}
            data-readonly={local.readOnly ? "" : undefined}
            data-required={local.required ? "" : undefined}
            class="z-checkbox-indicator grid place-content-center text-current transition-none"
          >
            <CheckIcon />
          </span>
        </Show>
      </Dynamic>
      <Show when={!checked() && local.name && !local.parent && local.uncheckedValue !== undefined}>
        <input
          type="hidden"
          form={local.form}
          name={local.name}
          value={local.uncheckedValue}
          disabled={local.disabled}
        />
      </Show>
      <input
        ref={setInput}
        type="checkbox"
        id={nativeButton() ? undefined : local.id}
        form={local.form}
        name={local.parent ? undefined : local.name}
        value={local.value ?? "on"}
        checked={checked()}
        disabled={local.disabled}
        required={local.required}
        aria-hidden="true"
        tabIndex={-1}
        class="sr-only"
        onClick={handleInputChange}
        onFocus={() => control?.focus()}
      />
    </>
  );
};

export { Checkbox, type CheckboxChangeDetails, type CheckboxProps };
