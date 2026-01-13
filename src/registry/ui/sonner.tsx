import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as ToastPrimitive from "@kobalte/core/toast";
import { CircleAlert, CircleCheck, CircleX, Info, Loader2, X } from "lucide-solid";
import type { Accessor, ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createEffect,
  createSignal,
  Match,
  mergeProps,
  onCleanup,
  Show,
  splitProps,
  Switch,
  useContext,
} from "solid-js";
import { Portal } from "solid-js/web";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * Toast Context for stacking state
 * -----------------------------------------------------------------------------------------------*/

type ToastContextValue = {
  expanded: Accessor<boolean>;
  position: Accessor<"top" | "bottom">;
};

const ToastContext = createContext<ToastContextValue>();

const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within a Toaster");
  }
  return context;
};

/* -------------------------------------------------------------------------------------------------
 * Toast Region (Toaster)
 * -----------------------------------------------------------------------------------------------*/

type ToasterProps = ToastPrimitive.ToastRegionProps &
  Pick<ComponentProps<"div">, "class"> & {
    /**
     * Position of the toasts
     * @default "top-center"
     */
    position?:
      | "top-left"
      | "top-center"
      | "top-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right";
    /**
     * Gap between toasts when expanded (in pixels)
     * @default 14
     */
    gap?: number;
    /**
     * Whether to expand toasts on hover
     * @default true
     */
    expand?: boolean;
    /**
     * Delay before collapsing toasts after mouse leaves (in ms)
     * @default 200
     */
    closeDelay?: number;
  };

const positionClasses: Record<NonNullable<ToasterProps["position"]>, string> = {
  "top-left": "top-0 left-0 items-start",
  "top-center": "top-0 left-1/2 -translate-x-1/2 items-center",
  "top-right": "top-0 right-0 items-end",
  "bottom-left": "bottom-0 left-0 items-start",
  "bottom-center": "bottom-0 left-1/2 -translate-x-1/2 items-center",
  "bottom-right": "bottom-0 right-0 items-end",
};

const Toaster = (props: ToasterProps) => {
  const mergedProps = mergeProps(
    {
      swipeDirection: "right",
      pauseOnInteraction: true,
      pauseOnPageIdle: true,
      duration: 5000,
      limit: 3,
      position: "top-center",
      gap: 14,
      expand: true,
      closeDelay: 200,
    } as ToasterProps,
    props,
  );
  const [local, others] = splitProps(mergedProps, [
    "class",
    "position",
    "gap",
    "expand",
    "closeDelay",
  ]);

  const [expanded, setExpanded] = createSignal(false);
  let closeTimeout: ReturnType<typeof setTimeout> | undefined;

  const handleMouseEnter = () => {
    if (!local.expand) return;
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = undefined;
    }
    setExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!local.expand) return;
    closeTimeout = setTimeout(() => {
      setExpanded(false);
    }, local.closeDelay);
  };

  onCleanup(() => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }
  });

  const yPosition = () => (local.position?.startsWith("top") ? "top" : "bottom");

  // Inject the stacking CSS
  createEffect(() => {
    const styleId = "sonner-stacking-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      /* Toast stacking system */
      [data-sonner-toaster] {
        --gap: ${local.gap}px;
        --offset: 0px;
        pointer-events: none;
      }

      [data-sonner-toaster] > ol {
        pointer-events: auto;
      }

      /* Base toast positioning */
      [data-sonner-toast] {
        --lift: 1;
        --index: 0;
        --toasts-before: 0;
        --z-index: 0;
        --scale: 1;
        --y: 0px;
        position: relative;
        transition: transform 400ms cubic-bezier(0.25, 1, 0.5, 1),
                    opacity 400ms cubic-bezier(0.25, 1, 0.5, 1),
                    height 400ms cubic-bezier(0.25, 1, 0.5, 1);
      }

      /* Y position variants */
      [data-sonner-toaster][data-y-position="top"] [data-sonner-toast] {
        --lift: 1;
      }

      [data-sonner-toaster][data-y-position="bottom"] [data-sonner-toast] {
        --lift: -1;
      }

      /* Collapsed state - toasts behind front */
      [data-sonner-toaster][data-expanded="false"] [data-sonner-toast]:not(:first-child) {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        opacity: 0;
        pointer-events: none;
      }

      [data-sonner-toaster][data-expanded="false"] [data-sonner-toast]:nth-child(2) {
        --toasts-before: 1;
        opacity: 0.8;
        transform: translateY(calc(var(--lift) * var(--gap) * 0.5)) scale(0.95);
      }

      [data-sonner-toaster][data-expanded="false"] [data-sonner-toast]:nth-child(3) {
        --toasts-before: 2;
        opacity: 0.6;
        transform: translateY(calc(var(--lift) * var(--gap) * 1)) scale(0.90);
      }

      [data-sonner-toaster][data-expanded="false"] [data-sonner-toast]:nth-child(n+4) {
        opacity: 0;
        transform: translateY(calc(var(--lift) * var(--gap) * 1.5)) scale(0.85);
      }

      /* Expanded state - all toasts visible */
      [data-sonner-toaster][data-expanded="true"] [data-sonner-toast] {
        position: relative;
        opacity: 1;
        transform: none;
        pointer-events: auto;
      }

      /* Content fade when collapsed */
      [data-sonner-toaster][data-expanded="false"] [data-sonner-toast]:not(:first-child) > * {
        opacity: 0;
        transition: opacity 200ms;
      }

      [data-sonner-toaster][data-expanded="true"] [data-sonner-toast] > * {
        opacity: 1;
        transition: opacity 400ms;
      }

      /* Hover area extension to prevent accidental collapse */
      [data-sonner-toaster][data-expanded="true"]::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        height: 20px;
      }

      [data-sonner-toaster][data-y-position="bottom"][data-expanded="true"]::after {
        top: auto;
        bottom: 100%;
      }
    `;
    document.head.appendChild(style);
  });

  return (
    <ToastContext.Provider value={{ expanded, position: yPosition }}>
      <Portal>
        <ToastPrimitive.Region
          data-slot="toaster"
          data-sonner-toaster=""
          data-expanded={expanded()}
          data-y-position={yPosition()}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          {...others}
        >
          <ToastPrimitive.List
            data-slot="toast-list"
            class={cn(
              "cn-toast-list fixed z-[100] flex w-full flex-col gap-[--gap] p-4 outline-none sm:max-w-[420px]",
              yPosition() === "bottom" && "flex-col-reverse",
              local.position && positionClasses[local.position],
              local.class,
            )}
          />
        </ToastPrimitive.Region>
      </Portal>
    </ToastContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Toast Root
 * -----------------------------------------------------------------------------------------------*/

type ToastVariant = "default" | "success" | "error" | "warning" | "info" | "loading";

type ToastProps<T extends ValidComponent = "li"> = PolymorphicProps<
  T,
  ToastPrimitive.ToastRootProps<T>
> &
  Pick<ComponentProps<"li">, "class" | "children"> & {
    variant?: ToastVariant;
  };

const Toast = <T extends ValidComponent = "li">(props: ToastProps<T>) => {
  const mergedProps = mergeProps({ variant: "default" } as ToastProps, props);
  const [local, others] = splitProps(mergedProps as ToastProps, ["class", "children", "variant"]);

  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-sonner-toast=""
      data-variant={local.variant}
      class={cn(
        "cn-toast group pointer-events-auto relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-lg border bg-background p-4 pr-8 shadow-lg",
        "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-(--kb-toast-swipe-end-x) data-[swipe=move]:translate-x-(--kb-toast-swipe-move-x) data-[swipe=move]:transition-none",
        "data-[opened]:animate-in data-[opened]:fade-in-0 data-[opened]:slide-in-from-top-full",
        "data-[closed]:animate-out data-[closed]:fade-out-80 data-[closed]:slide-out-to-right-full",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </ToastPrimitive.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Toast Close Button
 * -----------------------------------------------------------------------------------------------*/

type ToastCloseButtonProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ToastPrimitive.ToastCloseButtonProps<T>
> &
  Pick<ComponentProps<"button">, "class">;

const ToastCloseButton = <T extends ValidComponent = "button">(props: ToastCloseButtonProps<T>) => {
  const [local, others] = splitProps(props as ToastCloseButtonProps, ["class"]);

  return (
    <ToastPrimitive.CloseButton
      data-slot="toast-close-button"
      class={cn(
        "cn-toast-close-button absolute top-2 right-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
        local.class,
      )}
      {...others}
    >
      <X class="size-4" />
    </ToastPrimitive.CloseButton>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Toast Title
 * -----------------------------------------------------------------------------------------------*/

type ToastTitleProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ToastPrimitive.ToastTitleProps<T>
> &
  Pick<ComponentProps<"div">, "class">;

const ToastTitle = <T extends ValidComponent = "div">(props: ToastTitleProps<T>) => {
  const [local, others] = splitProps(props as ToastTitleProps, ["class"]);

  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      class={cn("cn-toast-title text-sm font-semibold", local.class)}
      {...others}
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * Toast Description
 * -----------------------------------------------------------------------------------------------*/

type ToastDescriptionProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ToastPrimitive.ToastDescriptionProps<T>
> &
  Pick<ComponentProps<"div">, "class">;

const ToastDescription = <T extends ValidComponent = "div">(props: ToastDescriptionProps<T>) => {
  const [local, others] = splitProps(props as ToastDescriptionProps, ["class"]);

  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      class={cn("cn-toast-description text-sm opacity-90", local.class)}
      {...others}
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * Toast Progress
 * -----------------------------------------------------------------------------------------------*/

type ToastProgressTrackProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ToastPrimitive.ToastProgressTrackProps<T>
> &
  Pick<ComponentProps<"div">, "class">;

const ToastProgressTrack = <T extends ValidComponent = "div">(
  props: ToastProgressTrackProps<T>,
) => {
  const [local, others] = splitProps(props as ToastProgressTrackProps, ["class"]);

  return (
    <ToastPrimitive.ProgressTrack
      data-slot="toast-progress-track"
      class={cn(
        "cn-toast-progress-track absolute inset-x-0 bottom-0 h-1 overflow-hidden",
        local.class,
      )}
      {...others}
    />
  );
};

type ToastProgressFillProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ToastPrimitive.ToastProgressFillProps<T>
> &
  Pick<ComponentProps<"div">, "class">;

const ToastProgressFill = <T extends ValidComponent = "div">(props: ToastProgressFillProps<T>) => {
  const [local, others] = splitProps(props as ToastProgressFillProps, ["class"]);

  return (
    <ToastPrimitive.ProgressFill
      data-slot="toast-progress-fill"
      class={cn(
        "cn-toast-progress-fill h-full w-(--kb-toast-progress-fill-width) transition-all",
        local.class,
      )}
      {...others}
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * Toast Action
 * -----------------------------------------------------------------------------------------------*/

type ToastActionProps = ComponentProps<"div">;

const ToastAction = (props: ToastActionProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div data-slot="toast-action" class={cn("cn-toast-action shrink-0", local.class)} {...others} />
  );
};

/* -------------------------------------------------------------------------------------------------
 * Toast Icon
 * -----------------------------------------------------------------------------------------------*/

type ToastIconProps = {
  variant?: ToastVariant;
  class?: string;
};

const ToastIcon = (props: ToastIconProps) => {
  const mergedProps = mergeProps({ variant: "default" } as ToastIconProps, props);

  return (
    <Switch>
      <Match when={mergedProps.variant === "success"}>
        <CircleCheck
          data-slot="toast-icon"
          class={cn("cn-toast-icon size-5 shrink-0 text-emerald-500", mergedProps.class)}
        />
      </Match>
      <Match when={mergedProps.variant === "error"}>
        <CircleX
          data-slot="toast-icon"
          class={cn("cn-toast-icon size-5 shrink-0 text-destructive", mergedProps.class)}
        />
      </Match>
      <Match when={mergedProps.variant === "warning"}>
        <CircleAlert
          data-slot="toast-icon"
          class={cn("cn-toast-icon size-5 shrink-0 text-amber-500", mergedProps.class)}
        />
      </Match>
      <Match when={mergedProps.variant === "info"}>
        <Info
          data-slot="toast-icon"
          class={cn("cn-toast-icon size-5 shrink-0 text-blue-500", mergedProps.class)}
        />
      </Match>
      <Match when={mergedProps.variant === "loading"}>
        <Loader2
          data-slot="toast-icon"
          class={cn(
            "cn-toast-icon size-5 shrink-0 animate-spin text-muted-foreground",
            mergedProps.class,
          )}
        />
      </Match>
    </Switch>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Toast Content (convenience wrapper)
 * -----------------------------------------------------------------------------------------------*/

type ToastContentProps = ComponentProps<"div">;

const ToastContent = (props: ToastContentProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="toast-content"
      class={cn("cn-toast-content flex flex-col gap-1", local.class)}
      {...others}
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * Toaster API (imperative toast function)
 * -----------------------------------------------------------------------------------------------*/

type ToastOptions = {
  title?: string;
  description?: string;
  duration?: number;
  action?: JSX.Element;
  onDismiss?: () => void;
  onAutoClose?: () => void;
};

type ShowToastOptions = ToastOptions & {
  variant?: ToastVariant;
};

/**
 * Creates a styled toast element for use with Kobalte's toaster
 */
function createToastContent(options: ShowToastOptions): JSX.Element {
  const { variant = "default", title, description, action } = options;

  return (
    <>
      <Show when={variant !== "default"}>
        <ToastIcon variant={variant} />
      </Show>
      <ToastContent>
        <Show when={title}>
          <ToastTitle>{title}</ToastTitle>
        </Show>
        <Show when={description}>
          <ToastDescription>{description}</ToastDescription>
        </Show>
      </ToastContent>
      <Show when={action}>
        <ToastAction>{action}</ToastAction>
      </Show>
      <ToastCloseButton />
    </>
  );
}

/**
 * Toast API object - provides imperative methods to show toasts
 *
 * @example
 * ```tsx
 * import { toast, Toaster } from "@/registry/ui/sonner"
 *
 * // In your app root
 * <Toaster />
 *
 * // Show toasts
 * toast.show({ title: "Event created" })
 * toast.success({ title: "Saved!", description: "Your changes have been saved." })
 * toast.error({ title: "Error", description: "Something went wrong." })
 * toast.warning({ title: "Warning", description: "Please review your input." })
 * toast.info({ title: "Info", description: "Here's some information." })
 * toast.loading({ title: "Loading...", description: "Please wait." })
 * ```
 */
const toast = {
  /**
   * Show a toast with the specified options
   */
  show(options: ShowToastOptions | string) {
    const opts: ShowToastOptions = typeof options === "string" ? { title: options } : options;
    return ToastPrimitive.toaster.show((toastProps) => (
      <Toast toastId={toastProps.toastId} variant={opts.variant} duration={opts.duration}>
        {createToastContent(opts)}
      </Toast>
    ));
  },

  /**
   * Show a success toast
   */
  success(options: ToastOptions | string) {
    const opts: ToastOptions = typeof options === "string" ? { title: options } : options;
    return this.show({ ...opts, variant: "success" });
  },

  /**
   * Show an error toast
   */
  error(options: ToastOptions | string) {
    const opts: ToastOptions = typeof options === "string" ? { title: options } : options;
    return this.show({ ...opts, variant: "error" });
  },

  /**
   * Show a warning toast
   */
  warning(options: ToastOptions | string) {
    const opts: ToastOptions = typeof options === "string" ? { title: options } : options;
    return this.show({ ...opts, variant: "warning" });
  },

  /**
   * Show an info toast
   */
  info(options: ToastOptions | string) {
    const opts: ToastOptions = typeof options === "string" ? { title: options } : options;
    return this.show({ ...opts, variant: "info" });
  },

  /**
   * Show a loading toast
   */
  loading(options: ToastOptions | string) {
    const opts: ToastOptions = typeof options === "string" ? { title: options } : options;
    return this.show({ ...opts, variant: "loading" });
  },

  /**
   * Update an existing toast
   */
  update<T>(id: number, render: (props: ToastPrimitive.ToastComponentProps<T>) => JSX.Element) {
    return ToastPrimitive.toaster.update(id, render);
  },

  /**
   * Dismiss a toast by ID
   */
  dismiss(id: number) {
    return ToastPrimitive.toaster.dismiss(id);
  },

  /**
   * Clear all toasts
   */
  clear() {
    return ToastPrimitive.toaster.clear();
  },

  /**
   * Show a promise toast that updates based on promise state
   */
  promise<T, U = unknown>(
    promise: Promise<T> | (() => Promise<T>),
    options: {
      loading: ToastOptions | string;
      success: ToastOptions | string | ((data: T) => ToastOptions | string);
      error: ToastOptions | string | ((error: U) => ToastOptions | string);
    },
  ) {
    const loadingOpts: ToastOptions =
      typeof options.loading === "string" ? { title: options.loading } : options.loading;

    return ToastPrimitive.toaster.promise(promise, (props) => (
      <Toast
        toastId={props.toastId}
        variant={
          props.state === "pending" ? "loading" : props.state === "fulfilled" ? "success" : "error"
        }
      >
        <Switch>
          <Match when={props.state === "pending"}>
            {createToastContent({ ...loadingOpts, variant: "loading" })}
          </Match>
          <Match when={props.state === "fulfilled"}>
            {(() => {
              const successOpts =
                typeof options.success === "function"
                  ? options.success(props.data as T)
                  : options.success;
              const opts: ToastOptions =
                typeof successOpts === "string" ? { title: successOpts } : successOpts;
              return createToastContent({ ...opts, variant: "success" });
            })()}
          </Match>
          <Match when={props.state === "rejected"}>
            {(() => {
              const errorOpts =
                typeof options.error === "function"
                  ? options.error(props.error as U)
                  : options.error;
              const opts: ToastOptions =
                typeof errorOpts === "string" ? { title: errorOpts } : errorOpts;
              return createToastContent({ ...opts, variant: "error" });
            })()}
          </Match>
        </Switch>
      </Toast>
    ));
  },
};

export {
  Toaster,
  Toast,
  ToastCloseButton,
  ToastTitle,
  ToastDescription,
  ToastProgressTrack,
  ToastProgressFill,
  ToastAction,
  ToastIcon,
  ToastContent,
  toast,
};
export type { ToasterProps, ToastProps, ToastVariant, ToastOptions };
