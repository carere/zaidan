import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, type JSX, splitProps } from "solid-js";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/registry/kobalte/ui/button";
import { Input } from "@/registry/kobalte/ui/input";
import { Textarea } from "@/registry/kobalte/ui/textarea";

type InputGroupProps = ComponentProps<"div">;

const InputGroup = (props: InputGroupProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    // biome-ignore lint/a11y/useSemanticElements: <exception for input group>
    <div
      data-slot="input-group"
      role="group"
      class={cn(
        "group/input-group cn-input-group relative flex w-full min-w-0 items-center outline-none has-[>textarea]:h-auto",
        local.class,
      )}
      {...others}
    />
  );
};

const inputGroupAddonVariants = cva(
  "cn-input-group-addon flex cursor-text select-none items-center justify-center",
  {
    variants: {
      align: {
        "inline-start": "cn-input-group-addon-align-inline-start order-first",
        "inline-end": "cn-input-group-addon-align-inline-end order-last",
        "block-start": "cn-input-group-addon-align-block-start order-first w-full justify-start",
        "block-end": "cn-input-group-addon-align-block-end order-last w-full justify-start",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

type InputGroupAddonProps = ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>;

const InputGroupAddon = (props: InputGroupAddonProps) => {
  const [local, others] = splitProps(props, ["class", "align", "onClick"]);
  const align = () => local.align ?? "inline-start";

  const handleClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = (e) => {
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    e.currentTarget.parentElement?.querySelector("input")?.focus();
    if (typeof local.onClick === "function") {
      local.onClick(e);
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: <exception for input group addon>
    // biome-ignore lint/a11y/useKeyWithClickEvents: <click delegates focus to input>
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align()}
      class={cn(inputGroupAddonVariants({ align: align() }), local.class)}
      onClick={handleClick}
      {...others}
    />
  );
};

const inputGroupButtonVariants = cva("cn-input-group-button flex items-center shadow-none", {
  variants: {
    size: {
      xs: "cn-input-group-button-size-xs",
      sm: "cn-input-group-button-size-sm",
      "icon-xs": "cn-input-group-button-size-icon-xs",
      "icon-sm": "cn-input-group-button-size-icon-sm",
    },
  },
  defaultVariants: {
    size: "xs",
  },
});

type InputGroupButtonProps = Omit<ButtonProps, "size"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset";
  };

const InputGroupButton = (props: InputGroupButtonProps) => {
  const [local, others] = splitProps(props, ["class", "type", "variant", "size"]);
  const size = () => local.size ?? "xs";
  const variant = () => local.variant ?? "ghost";
  const type = () => local.type ?? "button";

  return (
    <Button
      type={type()}
      data-size={size()}
      variant={variant()}
      class={cn(inputGroupButtonVariants({ size: size() }), local.class)}
      {...others}
    />
  );
};

type InputGroupTextProps = ComponentProps<"span">;

const InputGroupText = (props: InputGroupTextProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      class={cn("cn-input-group-text flex items-center [&_svg]:pointer-events-none", local.class)}
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
      class={cn("cn-input-group-input flex-1", local.class)}
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
      class={cn("cn-input-group-textarea flex-1 resize-none", local.class)}
      {...others}
    />
  );
};

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
  type InputGroupProps,
  type InputGroupAddonProps,
  type InputGroupButtonProps,
  type InputGroupTextProps,
  type InputGroupInputProps,
  type InputGroupTextareaProps,
};
