import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import {
  type ProgressFillProps,
  type ProgressLabelProps,
  Progress as ProgressPrimitive,
  type ProgressRootProps,
  type ProgressTrackProps,
  type ProgressValueLabelProps,
} from "@kobalte/core/progress";
import { type ComponentProps, splitProps, type ValidComponent } from "solid-js";
import { cn } from "@/lib/utils";

type ProgressProps<T extends ValidComponent = "div"> = PolymorphicProps<T, ProgressRootProps<T>> &
  Pick<ComponentProps<T>, "class" | "children">;

const Progress = <T extends ValidComponent = "div">(props: ProgressProps<T>) => {
  const [local, others] = splitProps(props as ProgressProps, ["class", "children"]);
  return (
    <ProgressPrimitive
      data-slot="progress"
      class={cn("cn-progress-root flex flex-wrap gap-3", local.class)}
      {...others}
    >
      {local.children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive>
  );
};

type ProgressTrackComponentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ProgressTrackProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const ProgressTrack = <T extends ValidComponent = "div">(props: ProgressTrackComponentProps<T>) => {
  const [local, others] = splitProps(props as ProgressTrackComponentProps, ["class"]);
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      class={cn(
        "cn-progress-track relative flex w-full items-center overflow-x-hidden",
        local.class,
      )}
      {...others}
    />
  );
};

type ProgressIndicatorProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ProgressFillProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const ProgressIndicator = <T extends ValidComponent = "div">(props: ProgressIndicatorProps<T>) => {
  const [local, others] = splitProps(props as ProgressIndicatorProps, ["class"]);
  return (
    <ProgressPrimitive.Fill
      data-slot="progress-indicator"
      class={cn("cn-progress-indicator h-full transition-all", local.class)}
      {...others}
    />
  );
};

type ProgressLabelComponentProps<T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  ProgressLabelProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const ProgressLabel = <T extends ValidComponent = "span">(
  props: ProgressLabelComponentProps<T>,
) => {
  const [local, others] = splitProps(props as ProgressLabelComponentProps, ["class"]);
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      class={cn("cn-progress-label", local.class)}
      {...others}
    />
  );
};

type ProgressValueProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ProgressValueLabelProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const ProgressValue = <T extends ValidComponent = "div">(props: ProgressValueProps<T>) => {
  const [local, others] = splitProps(props as ProgressValueProps, ["class"]);
  return (
    <ProgressPrimitive.ValueLabel
      data-slot="progress-value"
      class={cn("cn-progress-value", local.class)}
      {...others}
    />
  );
};

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue };
