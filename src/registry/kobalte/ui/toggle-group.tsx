import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import {
  type ToggleGroupItemProps,
  ToggleGroup as ToggleGroupPrimitive,
  type ToggleGroupRootProps,
} from "@kobalte/core/toggle-group";
import type { VariantProps } from "class-variance-authority";
import {
  type ComponentProps,
  createContext,
  type JSX,
  mergeProps,
  splitProps,
  useContext,
  type ValidComponent,
} from "solid-js";
import { cn } from "@/lib/utils";
import { toggleVariants } from "@/registry/kobalte/ui/toggle";

type ToggleGroupContextValue = VariantProps<typeof toggleVariants> & {
  spacing?: number;
  orientation?: "horizontal" | "vertical";
};

const ToggleGroupContext = createContext<ToggleGroupContextValue>({
  size: "default",
  variant: "default",
  spacing: 0,
  orientation: "horizontal",
});

type ToggleGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ToggleGroupRootProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
    orientation?: "horizontal" | "vertical";
  };

const ToggleGroup = <T extends ValidComponent = "div">(rawProps: ToggleGroupProps<T>) => {
  const props = mergeProps(
    {
      spacing: 0,
      orientation: "horizontal",
    } as const,
    rawProps,
  );
  const [local, others] = splitProps(props, [
    "class",
    "children",
    "variant",
    "size",
    "spacing",
    "orientation",
  ]);

  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={local.variant}
      data-size={local.size}
      data-spacing={local.spacing}
      data-orientation={local.orientation}
      style={{ "--gap": local.spacing } as JSX.CSSProperties}
      class={cn(
        "cn-toggle-group group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        local.class,
      )}
      {...others}
    >
      <ToggleGroupContext.Provider
        value={{
          variant: local.variant,
          size: local.size,
          spacing: local.spacing,
          orientation: local.orientation,
        }}
      >
        {local.children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
};

type ToggleGroupItemComponentProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ToggleGroupItemProps<T>
> &
  VariantProps<typeof toggleVariants> &
  Pick<ComponentProps<T>, "class" | "children">;

const ToggleGroupItem = <T extends ValidComponent = "button">(
  rawProps: ToggleGroupItemComponentProps<T>,
) => {
  const props = mergeProps({ variant: "default" as const, size: "default" as const }, rawProps);
  const [local, others] = splitProps(props as ToggleGroupItemComponentProps, [
    "class",
    "children",
    "variant",
    "size",
  ]);
  const context = useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || local.variant}
      data-size={context.size || local.size}
      data-spacing={context.spacing}
      class={cn(
        toggleVariants({
          variant: context.variant || local.variant,
          size: context.size || local.size,
          class:
            "cn-toggle-group-item shrink-0 focus:z-10 focus-visible:z-10 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l",
        }),
        local.class,
      )}
      {...others}
    >
      {local.children}
    </ToggleGroupPrimitive.Item>
  );
};

export { ToggleGroup, ToggleGroupItem };
