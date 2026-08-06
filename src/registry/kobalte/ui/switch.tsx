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

// Kobalte renders a role=group wrapper and exposes onChange, so it cannot preserve Base UI's
// cancelable change details, native-button/input-ref/form contract, or root/thumb slot DOM.
// Corvu has no Switch primitive; keep the pinned behavior in this standalone registry item.
type SwitchChangeDetails = {
  allowPropagation: () => void;
  cancel: () => void;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: "none";
  trigger: Element | undefined;
};

function createChangeDetails(event: Event): SwitchChangeDetails {
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

type SwitchProps<T extends ValidComponent = "span"> = Omit<
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
  inputRef?: (element: HTMLInputElement) => void;
  name?: string;
  nativeButton?: boolean;
  onCheckedChange?: (checked: boolean, details: SwitchChangeDetails) => void;
  readOnly?: boolean;
  ref?: (element: HTMLElement) => void;
  required?: boolean;
  size?: "sm" | "default";
  uncheckedValue?: string;
  value?: string;
};

const Switch = <T extends ValidComponent = "span">(props: SwitchProps<T>) => {
  const mergedProps = mergeProps(
    {
      defaultChecked: false,
      disabled: false,
      nativeButton: false,
      readOnly: false,
      required: false,
      size: "default" as const,
    },
    props,
  );
  const [local, others] = splitProps(mergedProps as SwitchProps, [
    "as",
    "aria-labelledby",
    "checked",
    "children",
    "class",
    "defaultChecked",
    "disabled",
    "form",
    "id",
    "inputRef",
    "name",
    "nativeButton",
    "onBlur",
    "onCheckedChange",
    "onClick",
    "onFocus",
    "onKeyDown",
    "onKeyUp",
    "onMouseDown",
    "onPointerDown",
    "readOnly",
    "ref",
    "required",
    "size",
    "tabIndex",
    "uncheckedValue",
    "value",
  ]);
  const [uncontrolledChecked, setUncontrolledChecked] = createSignal(local.defaultChecked ?? false);
  const checked = (): boolean => local.checked ?? uncontrolledChecked();
  const nativeButton = (): boolean =>
    Boolean(local.nativeButton && (local.as ?? "button") === "button");
  const rootId = `switch-${createUniqueId()}`;
  const [fallbackAriaLabelledBy, setFallbackAriaLabelledBy] = createSignal<string>();
  let control: HTMLElement | undefined;
  let input: HTMLInputElement | undefined;

  const setInput = (element: HTMLInputElement) => {
    input = element;
    local.inputRef?.(element);
  };

  createEffect(() => {
    if (!input) return;

    input.checked = checked();
    if (local.value === undefined) {
      input.removeAttribute("value");
      input.value = "on";
    } else {
      input.setAttribute("value", local.value);
      input.value = local.value;
    }
  });

  const syncFallbackAriaLabelledBy = () => {
    if (!input || local["aria-labelledby"]) {
      setFallbackAriaLabelledBy(undefined);
      return;
    }
    const parent = input.parentElement;
    const sibling = input.nextElementSibling;
    const label =
      (parent?.tagName === "LABEL" ? (parent as HTMLLabelElement) : undefined) ??
      (sibling instanceof HTMLLabelElement && sibling.htmlFor === input.id ? sibling : undefined) ??
      input.labels?.[0];

    if (label && !label.id) label.id = `${input.id || rootId}-label`;
    setFallbackAriaLabelledBy(label?.id || undefined);
  };

  createEffect(() => {
    local["aria-labelledby"];
    local.id;
    queueMicrotask(syncFallbackAriaLabelledBy);
  });

  onMount(() => {
    syncFallbackAriaLabelledBy();

    const documentElement = input?.ownerDocument.documentElement;
    const MutationObserverConstructor = input?.ownerDocument.defaultView?.MutationObserver;
    if (!documentElement || !MutationObserverConstructor) return;

    const observer = new MutationObserverConstructor(syncFallbackAriaLabelledBy);
    observer.observe(documentElement, {
      attributeFilter: ["for", "id"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    onCleanup(() => observer.disconnect());
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

  const handleInputClick: JSX.EventHandler<HTMLInputElement, MouseEvent> = (event) => {
    if (local.readOnly) {
      event.preventDefault();
      event.currentTarget.checked = checked();
      return;
    }

    const nextChecked = event.currentTarget.checked;
    const details = createChangeDetails(event);
    local.onCheckedChange?.(nextChecked, details);
    if (details.isCanceled) {
      event.preventDefault();
      event.currentTarget.checked = checked();
      return;
    }

    if (local.checked === undefined) setUncontrolledChecked(nextChecked);
    else event.currentTarget.checked = checked();
  };

  const handleClick: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => {
    if (local.disabled) {
      event.preventDefault();
      return;
    }
    callEventHandler(
      local.onClick as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
      event,
    );
    if (event.defaultPrevented || local.readOnly) return;

    event.preventDefault();
    if (!input) return;
    const PointerEventConstructor = input.ownerDocument.defaultView?.PointerEvent ?? MouseEvent;
    input.dispatchEvent(
      new PointerEventConstructor("click", {
        altKey: event.altKey,
        bubbles: true,
        cancelable: true,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      }),
    );
  };

  const handleKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    if (local.disabled) return;
    callEventHandler(
      local.onKeyDown as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (
      event.defaultPrevented ||
      nativeButton() ||
      event.target !== event.currentTarget ||
      (event.currentTarget instanceof HTMLAnchorElement && event.currentTarget.href)
    ) {
      return;
    }

    if (event.key === " " || event.key === "Enter") event.preventDefault();
    if (event.key === "Enter") event.currentTarget.click();
  };

  const handleKeyUp: JSX.EventHandler<HTMLElement, KeyboardEvent> = (event) => {
    if (local.disabled) return;
    callEventHandler(
      local.onKeyUp as JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> | undefined,
      event,
    );
    if (
      event.defaultPrevented ||
      nativeButton() ||
      event.target !== event.currentTarget ||
      (event.currentTarget instanceof HTMLAnchorElement && event.currentTarget.href) ||
      event.key !== " "
    ) {
      return;
    }

    event.currentTarget.click();
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
        role="switch"
        aria-checked={checked()}
        aria-disabled={!nativeButton() && local.disabled ? true : undefined}
        aria-labelledby={local["aria-labelledby"] ?? fallbackAriaLabelledBy()}
        aria-readonly={local.readOnly || undefined}
        aria-required={local.required || undefined}
        tabIndex={local.tabIndex ?? (local.disabled && !nativeButton() ? -1 : 0)}
        data-slot="switch"
        data-size={local.size}
        data-checked={checked() ? "" : undefined}
        data-unchecked={!checked() ? "" : undefined}
        data-disabled={local.disabled ? "" : undefined}
        data-readonly={local.readOnly ? "" : undefined}
        data-required={local.required ? "" : undefined}
        class={cn(
          "z-switch peer group/switch relative inline-flex items-center outline-none transition-all after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
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
        onMouseDown={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
          if (!local.disabled) {
            callEventHandler(
              local.onMouseDown as JSX.EventHandlerUnion<HTMLElement, MouseEvent> | undefined,
              event,
            );
          }
        }}
        onPointerDown={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
          if (local.disabled) {
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
        <span
          data-slot="switch-thumb"
          data-checked={checked() ? "" : undefined}
          data-unchecked={!checked() ? "" : undefined}
          data-disabled={local.disabled ? "" : undefined}
          data-readonly={local.readOnly ? "" : undefined}
          data-required={local.required ? "" : undefined}
          class="z-switch-thumb pointer-events-none block ring-0 transition-transform"
        />
      </Dynamic>
      <Show when={!checked() && local.name && local.uncheckedValue !== undefined}>
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
        id={nativeButton() ? undefined : (local.id ?? `${rootId}-input`)}
        form={local.form}
        name={local.name}
        checked={checked()}
        disabled={local.disabled}
        required={local.required}
        aria-hidden="true"
        tabIndex={-1}
        class="sr-only"
        onClick={handleInputClick}
        onFocus={() => control?.focus()}
      />
    </>
  );
};

export { Switch, type SwitchChangeDetails, type SwitchProps };
