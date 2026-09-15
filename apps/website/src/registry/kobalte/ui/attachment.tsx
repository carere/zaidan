import { cva, type VariantProps } from "class-variance-authority";
import {
  type ComponentProps,
  type JSX,
  mergeProps,
  splitProps,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/registry/kobalte/ui/button";

const attachmentVariants = cva(
  "z-attachment group/attachment relative flex max-w-full min-w-0 shrink-0 flex-wrap border bg-card text-card-foreground transition-colors has-[>a,>button]:hover:bg-muted/50 data-[state=error]:border-destructive/30 data-[state=idle]:border-dashed",
  {
    variants: {
      size: {
        default: "z-attachment-size-default",
        sm: "z-attachment-size-sm",
        xs: "z-attachment-size-xs",
      },
      orientation: {
        horizontal: "z-attachment-orientation-horizontal items-center",
        vertical: "z-attachment-orientation-vertical flex-col",
      },
    },
  },
);

type AttachmentProps = ComponentProps<"div"> &
  VariantProps<typeof attachmentVariants> & {
    state?: "idle" | "uploading" | "processing" | "error" | "done";
  };

const Attachment = (rawProps: AttachmentProps) => {
  const props = mergeProps(
    {
      orientation: "horizontal" as const,
      size: "default" as const,
      state: "done" as const,
    },
    rawProps,
  );
  const [local, others] = splitProps(props, ["class", "orientation", "size", "state"]);

  return (
    <div
      data-slot="attachment"
      data-state={local.state}
      data-size={local.size}
      data-orientation={local.orientation}
      class={cn(
        attachmentVariants({ size: local.size, orientation: local.orientation }),
        local.class,
      )}
      {...others}
    />
  );
};

const attachmentMediaVariants = cva(
  "z-attachment-media relative flex aspect-square shrink-0 items-center justify-center overflow-hidden group-data-[state=error]/attachment:bg-destructive/10 group-data-[state=error]/attachment:text-destructive [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        icon: "z-attachment-media-variant-icon",
        image:
          "z-attachment-media-variant-image *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "icon",
    },
  },
);

type AttachmentMediaProps = ComponentProps<"div"> & VariantProps<typeof attachmentMediaVariants>;

const AttachmentMedia = (rawProps: AttachmentMediaProps) => {
  const props = mergeProps({ variant: "icon" as const }, rawProps);
  const [local, others] = splitProps(props, ["class", "variant"]);

  return (
    <div
      data-slot="attachment-media"
      data-variant={local.variant}
      class={cn(attachmentMediaVariants({ variant: local.variant }), local.class)}
      {...others}
    />
  );
};

type AttachmentContentProps = ComponentProps<"div">;

const AttachmentContent = (props: AttachmentContentProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="attachment-content"
      class={cn("z-attachment-content max-w-full min-w-0 flex-1", local.class)}
      {...others}
    />
  );
};

type AttachmentTitleProps = ComponentProps<"span">;

const AttachmentTitle = (props: AttachmentTitleProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <span
      data-slot="attachment-title"
      class={cn(
        "z-attachment-title block max-w-full min-w-0 truncate group-data-[state=processing]/attachment:shimmer group-data-[state=uploading]/attachment:shimmer",
        local.class,
      )}
      {...others}
    />
  );
};

type AttachmentDescriptionProps = ComponentProps<"span">;

const AttachmentDescription = (props: AttachmentDescriptionProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <span
      data-slot="attachment-description"
      class={cn(
        "z-attachment-description block min-w-0 truncate text-muted-foreground group-data-[state=error]/attachment:text-destructive/80 max-w-full",
        local.class,
      )}
      {...others}
    />
  );
};

type AttachmentActionsProps = ComponentProps<"div">;

const AttachmentActions = (props: AttachmentActionsProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="attachment-actions"
      class={cn("z-attachment-actions flex shrink-0 items-center", local.class)}
      {...others}
    />
  );
};

type AttachmentActionProps<T extends ValidComponent = "button"> = ButtonProps<T>;

const AttachmentAction = <T extends ValidComponent = "button">(
  rawProps: AttachmentActionProps<T>,
) => {
  const props = mergeProps({ size: "icon-xs" as const }, rawProps);
  const [local, others] = splitProps(props as AttachmentActionProps, ["class", "variant"]);

  return (
    <Button
      data-slot="attachment-action"
      variant={local.variant ?? "ghost"}
      class={cn("z-attachment-action", local.class)}
      {...others}
    />
  );
};

type AttachmentTriggerProps<T extends ValidComponent = "button"> = {
  as?: T;
  class?: string | undefined;
  children?: JSX.Element;
  type?: ComponentProps<"button">["type"];
} & Omit<ComponentProps<T>, "as" | "children" | "class" | "type">;

const AttachmentTrigger = <T extends ValidComponent = "button">(
  rawProps: AttachmentTriggerProps<T>,
) => {
  const hasCustomElement = () => rawProps.as !== undefined;
  const props = mergeProps({ as: "button" as T } as const, rawProps);
  const [local, others] = splitProps(props as AttachmentTriggerProps, ["as", "class", "type"]);

  return (
    <Dynamic
      component={local.as}
      data-slot="attachment-trigger"
      type={hasCustomElement() ? local.type : (local.type ?? "button")}
      class={cn("z-attachment-trigger absolute inset-0 z-10 outline-none", local.class)}
      {...others}
    />
  );
};

type AttachmentGroupProps = ComponentProps<"div">;

const AttachmentGroup = (props: AttachmentGroupProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="attachment-group"
      class={cn(
        "z-attachment-group flex min-w-0 scroll-fade-x snap-x snap-mandatory scrollbar-none overflow-x-auto overscroll-x-contain *:data-[slot=attachment]:flex-none *:data-[slot=attachment]:snap-start",
        local.class,
      )}
      {...others}
    />
  );
};

export {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
};
