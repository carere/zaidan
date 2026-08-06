import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, mergeProps, splitProps } from "solid-js";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/registry/kobalte/ui/button";
import { Input } from "@/registry/kobalte/ui/input";
import { Textarea } from "@/registry/kobalte/ui/textarea";

type InputGroupProps = ComponentProps<"div">;

const InputGroup = (props: InputGroupProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" matches the pinned shadcn contract
    <div
      data-slot="input-group"
      role="group"
      class={cn(
        "group/input-group z-input-group relative flex w-full min-w-0 items-center outline-none has-[>textarea]:h-auto",
        local.class,
      )}
      {...others}
    />
  );
};

const inputGroupAddonVariants = cva(
  "z-input-group-addon flex cursor-text items-center justify-center select-none",
  {
    variants: {
      align: {
        "inline-start": "z-input-group-addon-align-inline-start order-first",
        "inline-end": "z-input-group-addon-align-inline-end order-last",
        "block-start": "z-input-group-addon-align-block-start order-first w-full justify-start",
        "block-end": "z-input-group-addon-align-block-end order-last w-full justify-start",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

type InputGroupAddonProps = ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>;

const InputGroupAddon = (rawProps: InputGroupAddonProps) => {
  const props = mergeProps({ align: "inline-start" } as const, rawProps);
  const [local, others] = splitProps(props, ["class", "align"]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" matches the pinned shadcn contract
    // biome-ignore lint/a11y/useKeyWithClickEvents: pointer activation delegates focus to the input
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={local.align}
      class={cn(inputGroupAddonVariants({ align: local.align }), local.class)}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) {
          return;
        }
        event.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...others}
    />
  );
};

const inputGroupButtonVariants = cva("z-input-group-button flex items-center shadow-none", {
  variants: {
    size: {
      xs: "z-input-group-button-size-xs",
      sm: "z-input-group-button-size-sm",
      "icon-xs": "z-input-group-button-size-icon-xs",
      "icon-sm": "z-input-group-button-size-icon-sm",
    },
  },
  defaultVariants: {
    size: "xs",
  },
});

type InputGroupButtonProps = Omit<ButtonProps, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset";
  };

const InputGroupButton = (rawProps: InputGroupButtonProps) => {
  const props = mergeProps({ type: "button", variant: "ghost", size: "xs" } as const, rawProps);
  const [local, others] = splitProps(props, ["class", "type", "variant", "size"]);

  return (
    <Button
      type={local.type}
      data-size={local.size}
      variant={local.variant}
      class={cn(inputGroupButtonVariants({ size: local.size }), local.class)}
      {...others}
    />
  );
};

type InputGroupTextProps = ComponentProps<"span">;

const InputGroupText = (props: InputGroupTextProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      class={cn("z-input-group-text flex items-center [&_svg]:pointer-events-none", local.class)}
      {...others}
    />
  );
};

type InputGroupInputProps = ComponentProps<"input">;

const InputGroupInput = (props: InputGroupInputProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Input
      data-slot="input-group-control"
      class={cn("z-input-group-input flex-1", local.class)}
      {...others}
    />
  );
};

type InputGroupTextareaProps = ComponentProps<"textarea">;

const InputGroupTextarea = (props: InputGroupTextareaProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Textarea
      data-slot="input-group-control"
      class={cn("z-input-group-textarea flex-1 resize-none", local.class)}
      {...others}
    />
  );
};

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
};
