import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import {
  Fill,
  type ProgressLabelProps as KobalteProgressLabelProps,
  type ProgressTrackProps as KobalteProgressTrackProps,
  Label,
  type ProgressFillProps,
  type ProgressRootProps,
  Root,
  Track,
} from "@kobalte/core/progress";
import {
  type Accessor,
  type ComponentProps,
  createContext,
  createEffect,
  createMemo,
  type JSX,
  mergeProps,
  splitProps,
  useContext,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";

type ProgressStatus = "indeterminate" | "progressing" | "complete";

type ProgressContextValue = {
  formattedValue: Accessor<string | null>;
  percentageValue: Accessor<number | null>;
  status: Accessor<ProgressStatus>;
  value: Accessor<number | null>;
};

const ProgressContext = createContext<ProgressContextValue>();

function useBaseProgressContext() {
  const context = useContext(ProgressContext);

  if (!context) {
    throw new Error("Progress parts must be used within Progress");
  }

  return context;
}

function getDefaultAriaValueText(formattedValue: string | null, value: number | null) {
  if (value === null) return "indeterminate progress";
  return formattedValue || `${value}%`;
}

function getStateAttributes(status: Accessor<ProgressStatus>) {
  return {
    get "data-complete"() {
      return status() === "complete" ? "" : undefined;
    },
    get "data-indeterminate"() {
      return status() === "indeterminate" ? "" : undefined;
    },
    get "data-progressing"() {
      return status() === "progressing" ? "" : undefined;
    },
  };
}

function mergeIndicatorStyle(
  percentageValue: number | null,
  style: JSX.CSSProperties | string | undefined,
) {
  if (percentageValue === null) return style;

  const indicatorStyle = {
    "--kb-progress-fill-width": `${percentageValue}%`,
    "inset-inline-start": "0",
    height: "inherit",
    width: `${percentageValue}%`,
  } as JSX.CSSProperties;

  if (typeof style === "string") {
    return `--kb-progress-fill-width:${percentageValue}%;inset-inline-start:0;height:inherit;width:${percentageValue}%;${style}`;
  }

  return { ...indicatorStyle, ...style };
}

type ProgressProps<T extends ValidComponent = "div"> = Omit<
  PolymorphicProps<T, ProgressRootProps<T>>,
  "getValueLabel" | "indeterminate" | "maxValue" | "minValue" | "value"
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    format?: Intl.NumberFormatOptions;
    getAriaValueText?: (formattedValue: string | null, value: number | null) => string;
    locale?: Intl.LocalesArgument;
    max?: number;
    min?: number;
    value: number | null;
  };

const Progress = <T extends ValidComponent = "div">(props: ProgressProps<T>) => {
  const mergedProps = mergeProps(
    {
      max: 100,
      min: 0,
      value: null,
    },
    props,
  );
  const [local, others] = splitProps(mergedProps as ProgressProps, [
    "aria-valuetext",
    "children",
    "class",
    "format",
    "getAriaValueText",
    "locale",
    "max",
    "min",
    "ref",
    "value",
  ]);
  let rootElement: HTMLElement | undefined;
  const value = () => local.value;
  const min = () => local.min ?? 0;
  const max = () => local.max ?? 100;
  const status = createMemo<ProgressStatus>(() => {
    if (!Number.isFinite(value())) return "indeterminate";
    return value() === max() ? "complete" : "progressing";
  });
  const formattedValue = createMemo<string | null>(() => {
    const currentValue = value();
    if (currentValue === null) return null;

    if (local.format) {
      return new Intl.NumberFormat(local.locale, local.format).format(currentValue);
    }

    return new Intl.NumberFormat(local.locale, { style: "percent" }).format(currentValue / 100);
  });
  const percentageValue = createMemo<number | null>(() => {
    const currentValue = value();
    if (currentValue === null || !Number.isFinite(currentValue)) return null;
    return ((currentValue - min()) * 100) / (max() - min());
  });
  const ariaValueText = () =>
    local["aria-valuetext"] ??
    (local.getAriaValueText ?? getDefaultAriaValueText)(formattedValue(), value());
  createEffect(() => rootElement?.setAttribute("aria-valuetext", ariaValueText()));
  const stateAttributes = getStateAttributes(status);
  const context: ProgressContextValue = {
    formattedValue,
    percentageValue,
    status,
    value,
  };

  return (
    <ProgressContext.Provider value={context}>
      <Root
        value={value() ?? min()}
        minValue={min()}
        maxValue={max()}
        indeterminate={status() === "indeterminate"}
        getValueLabel={ariaValueText}
        data-slot="progress"
        {...stateAttributes}
        class={cn("z-progress-root flex flex-wrap gap-3", local.class)}
        ref={(element) => {
          rootElement = element;
          if (typeof local.ref === "function") local.ref(element);
        }}
        {...others}
      >
        {local.children}
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
        <span
          role="presentation"
          style={{
            border: "0",
            clip: "rect(0 0 0 0)",
            height: "1px",
            margin: "-1px",
            overflow: "hidden",
            padding: "0",
            position: "absolute",
            "white-space": "nowrap",
            width: "1px",
          }}
        >
          x
        </span>
      </Root>
    </ProgressContext.Provider>
  );
};

type ProgressTrackProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  KobalteProgressTrackProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const ProgressTrack = <T extends ValidComponent = "div">(props: ProgressTrackProps<T>) => {
  const context = useBaseProgressContext();
  const [local, others] = splitProps(props as ProgressTrackProps, ["class"]);

  return (
    <Track
      data-slot="progress-track"
      {...getStateAttributes(context.status)}
      class={cn(
        "z-progress-track relative flex w-full items-center overflow-x-hidden",
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
  const context = useBaseProgressContext();
  const [local, others] = splitProps(props as ProgressIndicatorProps, ["class", "style"]);

  return (
    <Fill
      data-slot="progress-indicator"
      {...getStateAttributes(context.status)}
      class={cn(
        "z-progress-indicator h-full w-(--kb-progress-fill-width) transition-all",
        local.class,
      )}
      style={mergeIndicatorStyle(context.percentageValue(), local.style)}
      {...others}
    />
  );
};

type ProgressLabelProps<T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  KobalteProgressLabelProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const ProgressLabel = <T extends ValidComponent = "span">(props: ProgressLabelProps<T>) => {
  const context = useBaseProgressContext();
  const [local, others] = splitProps(props as ProgressLabelProps, ["class"]);

  return (
    <Label
      role="presentation"
      data-slot="progress-label"
      {...getStateAttributes(context.status)}
      class={cn("z-progress-label", local.class)}
      {...others}
    />
  );
};

type ProgressValueProps<T extends ValidComponent = "span"> = Omit<ComponentProps<T>, "children"> & {
  as?: T;
  children?: null | ((formattedValue: string | null, value: number | null) => JSX.Element);
};

const ProgressValue = <T extends ValidComponent = "span">(props: ProgressValueProps<T>) => {
  const context = useBaseProgressContext();
  const [local, others] = splitProps(props as ProgressValueProps, ["as", "children", "class"]);
  const displayValue = () => {
    const value = context.value();

    if (typeof local.children === "function") {
      return local.children(value === null ? "indeterminate" : context.formattedValue(), value);
    }

    return value === null ? null : context.formattedValue();
  };

  return (
    <Dynamic
      component={local.as ?? "span"}
      aria-hidden="true"
      data-slot="progress-value"
      {...getStateAttributes(context.status)}
      class={cn("z-progress-value", local.class)}
      {...others}
    >
      {displayValue()}
    </Dynamic>
  );
};

export { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue };
