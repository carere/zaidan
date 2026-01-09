import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import {
  type SliderFillProps,
  Slider as SliderPrimitive,
  type SliderRootProps,
  type SliderThumbProps,
  type SliderTrackProps,
} from "@kobalte/core/slider";
import { type ComponentProps, For, mergeProps, splitProps, type ValidComponent } from "solid-js";
import { cn } from "@/lib/utils";

type SliderProps<T extends ValidComponent = "div"> = PolymorphicProps<T, SliderRootProps<T>> &
  Pick<ComponentProps<T>, "class">;

const Slider = <T extends ValidComponent = "div">(rawProps: SliderProps<T>) => {
  const props = mergeProps(
    {
      minValue: 0,
      maxValue: 100,
    },
    rawProps,
  );
  const [local, others] = splitProps(props as SliderProps, ["class", "defaultValue", "value"]);

  const values = () => {
    if (Array.isArray(others.value)) return others.value;
    if (Array.isArray(local.defaultValue)) return local.defaultValue;
    return [props.minValue ?? 0, props.maxValue ?? 100];
  };

  return (
    <SliderPrimitive
      data-slot="slider"
      defaultValue={local.defaultValue}
      value={others.value}
      class={cn(
        "cn-slider relative flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[disabled]:opacity-50",
        local.class,
      )}
      {...others}
    >
      <SliderTrack>
        <SliderFill />
      </SliderTrack>
      <For each={values()}>{() => <SliderThumb />}</For>
    </SliderPrimitive>
  );
};

type SliderTrackComponentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SliderTrackProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const SliderTrack = <T extends ValidComponent = "div">(props: SliderTrackComponentProps<T>) => {
  const [local, others] = splitProps(props as SliderTrackComponentProps, ["class", "children"]);
  return (
    <SliderPrimitive.Track
      data-slot="slider-track"
      class={cn(
        "cn-slider-track relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1.5",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </SliderPrimitive.Track>
  );
};

type SliderFillComponentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SliderFillProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const SliderFill = <T extends ValidComponent = "div">(props: SliderFillComponentProps<T>) => {
  const [local, others] = splitProps(props as SliderFillComponentProps, ["class"]);
  return (
    <SliderPrimitive.Fill
      data-slot="slider-range"
      class={cn(
        "cn-slider-range absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
        local.class,
      )}
      {...others}
    />
  );
};

type SliderThumbComponentProps<T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  SliderThumbProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const SliderThumb = <T extends ValidComponent = "span">(props: SliderThumbComponentProps<T>) => {
  const [local, others] = splitProps(props as SliderThumbComponentProps, ["class"]);
  return (
    <SliderPrimitive.Thumb
      data-slot="slider-thumb"
      class={cn(
        "cn-slider-thumb block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50",
        local.class,
      )}
      {...others}
    >
      <SliderPrimitive.Input />
    </SliderPrimitive.Thumb>
  );
};

export { Slider, SliderTrack, SliderFill, SliderThumb };
