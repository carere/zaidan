import { type ComponentProps, mergeProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type CardProps = ComponentProps<"div"> & { size?: "default" | "sm" };

const Card = (props: CardProps) => {
  const mergedProps = mergeProps({ size: "default" } as const, props);
  const [local, others] = splitProps(mergedProps, ["class", "size"]);
  return (
    <div
      data-slot="card"
      data-size={local.size}
      class={cn("cn-card group/card flex flex-col", local.class)}
      {...others}
    />
  );
};

type CardHeaderProps = ComponentProps<"div">;

const CardHeader = (props: CardHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="card-header"
      class={cn(
        "cn-card-header group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        local.class,
      )}
      {...others}
    />
  );
};

type CardTitleProps = ComponentProps<"div">;

const CardTitle = (props: CardTitleProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div data-slot="card-title" class={cn("cn-card-title", local.class)} {...others} />;
};

type CardDescriptionProps = ComponentProps<"div">;

const CardDescription = (props: CardDescriptionProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div data-slot="card-description" class={cn("cn-card-description", local.class)} {...others} />
  );
};

type CardActionProps = ComponentProps<"div">;

const CardAction = (props: CardActionProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="card-action"
      class={cn(
        "cn-card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        local.class,
      )}
      {...others}
    />
  );
};

type CardContentProps = ComponentProps<"div">;

const CardContent = (props: CardContentProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div data-slot="card-content" class={cn("cn-card-content", local.class)} {...others} />;
};

type CardFooterProps = ComponentProps<"div">;

const CardFooter = (props: CardFooterProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="card-footer"
      class={cn("cn-card-footer flex items-center", local.class)}
      {...others}
    />
  );
};

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
