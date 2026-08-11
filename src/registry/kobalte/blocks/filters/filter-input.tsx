import { CircleAlert, X } from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createSignal, onCleanup, Show, splitProps } from "solid-js";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/registry/kobalte/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";
import { useFilterContext } from "./context";
import type { FilterInputProps, FilterRemoveButtonProps } from "./types";

const IGNORED_VALIDATION_KEYS = [
  "Tab",
  "Escape",
  "Enter",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
];

const FilterInput = <T = unknown>(props: FilterInputProps<T>) => {
  const context = useFilterContext();
  const [isValid, setIsValid] = createSignal(true);
  const [validationMessage, setValidationMessage] = createSignal("");
  let inputRef: HTMLInputElement | undefined;

  const [local, others] = splitProps(props, [
    "autofocus",
    "class",
    "field",
    "onBlur",
    "onKeyDown",
    "pattern",
  ]);

  createEffect(() => {
    if (!local.autofocus) return;
    const timer = setTimeout(() => inputRef?.focus(), 300);
    onCleanup(() => clearTimeout(timer));
  });

  // Validation function to check if input matches pattern
  const validateInput = (value: string, pattern?: string): boolean => {
    if (!pattern || !value) return true;
    const regex = new RegExp(pattern);
    return regex.test(value);
  };

  // Get validation message for field type
  const getValidationMessage = (): string => context.i18n.validation.invalid;

  // Handle blur event - validate when user leaves input
  const handleBlur: JSX.EventHandler<HTMLInputElement, FocusEvent> = (event) => {
    const value = event.currentTarget.value;
    const pattern = local.field?.pattern || local.pattern;
    const validation = local.field?.validation;

    // Only validate if there's a value and (pattern or validation function)
    if (value && (pattern || validation)) {
      let valid = true;
      let customMessage = "";

      // If there's a custom validation function, use it
      if (validation) {
        const result = validation(value);
        // Handle both boolean and object return types
        if (typeof result === "boolean") {
          valid = result;
        } else {
          valid = result.valid;
          customMessage = result.message || "";
        }
      } else if (pattern) {
        // Use pattern validation
        valid = validateInput(value, pattern);
      }

      setIsValid(valid);
      setValidationMessage(valid ? "" : customMessage || getValidationMessage());
    } else {
      // Reset validation state for empty values or no validation
      setIsValid(true);
      setValidationMessage("");
    }

    // Call the original onBlur if provided
    local.onBlur?.(event);
  };

  // Handle keydown event - hide validation error when user starts typing
  const handleKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (event) => {
    // Hide validation error when user starts typing (any key except special keys)
    if (!isValid() && !IGNORED_VALIDATION_KEYS.includes(event.key)) {
      setIsValid(true);
      setValidationMessage("");
    }

    // Call the original onKeyDown if provided
    local.onKeyDown?.(event);
  };

  return (
    <InputGroup
      class={cn(
        "w-36",
        // Height follows each style's own control ladder. `default` sets no
        // height on purpose so the style's `.z-input-group` applies (h-8 nova,
        // h-9 maia/luma, h-7 mira, h-10 sera); sm/lg step down/up from it.
        // Base covers nova/lyra/rhea/vega; only deviating styles are listed.
        context.size === "sm" &&
          "h-7! style-maia:h-8! style-luma:h-8! style-mira:h-6! style-sera:h-9!",
        context.size === "lg" &&
          "h-9! style-maia:h-10! style-luma:h-10! style-mira:h-8! style-sera:h-11!",
        // Sera's `.z-input` is `px-0` (underline inputs sit flush); inside a
        // segmented chip that collides with the neighbouring segment, so give
        // the value input the same inline padding sera uses elsewhere.
        "style-sera:px-2.5",
        local.class,
      )}
    >
      <Show when={local.field?.prefix}>
        <InputGroupAddon>
          <InputGroupText>{local.field?.prefix}</InputGroupText>
        </InputGroupAddon>
      </Show>
      <InputGroupInput
        ref={inputRef}
        autofocus={local.autofocus}
        pattern={local.pattern}
        aria-invalid={!isValid()}
        aria-describedby={
          !isValid() && validationMessage() ? `${local.field?.key || "input"}-error` : undefined
        }
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        class={cn(
          context.size === "sm" &&
            "h-7! text-xs style-maia:h-8! style-luma:h-8! style-mira:h-6! style-sera:h-9!",
          context.size === "lg" &&
            "h-9! style-maia:h-10! style-luma:h-10! style-mira:h-8! style-sera:h-11!",
        )}
        {...others}
      />
      <Show when={!isValid() && validationMessage()}>
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger as={InputGroupButton} size="icon-xs">
              <CircleAlert class="size-3.5 text-destructive" />
            </TooltipTrigger>
            <TooltipContent>
              <p class="text-sm">{validationMessage()}</p>
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      </Show>

      <Show when={local.field?.suffix}>
        <InputGroupAddon align="inline-end">
          <InputGroupText>{local.field?.suffix}</InputGroupText>
        </InputGroupAddon>
      </Show>
    </InputGroup>
  );
};

const FilterRemoveButton = (props: FilterRemoveButtonProps) => {
  const context = useFilterContext();
  const [local, others] = splitProps(props, ["class", "icon"]);

  return (
    <Button
      variant="outline"
      size={context.size === "sm" ? "icon-sm" : context.size === "lg" ? "icon-lg" : "icon"}
      class={local.class}
      {...others}
    >
      <Show when={local.icon} fallback={<X />}>
        {local.icon}
      </Show>
    </Button>
  );
};

export { FilterInput, FilterRemoveButton };
