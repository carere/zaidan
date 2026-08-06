import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as ToastPrimitive from "@kobalte/core/toast";
import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert, X } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createContext,
  createEffect,
  createSignal,
  Index,
  Match,
  mergeProps,
  onCleanup,
  onMount,
  Show,
  Switch,
  splitProps,
  useContext,
} from "solid-js";
import { Portal } from "solid-js/web";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/registry/kobalte/ui/button";

type ToastTransitionStatus = "ending" | "starting";
type ToastSwipeDirection = ToastPrimitive.ToastSwipeDirection;

interface ToastObject<Data extends object = Record<string, unknown>> {
  id: string;
  title?: JSX.Element;
  type?: string;
  description?: JSX.Element;
  timeout?: number;
  priority?: "high" | "low";
  transitionStatus?: ToastTransitionStatus;
  updateKey?: number;
  limited?: boolean;
  height?: number;
  onClose?: () => void;
  onRemove?: () => void;
  actionProps?: ComponentProps<"button">;
  data?: Data;
}

interface ToastManagerAddOptions<Data extends object>
  extends Omit<ToastObject<Data>, "height" | "id" | "limited" | "transitionStatus" | "updateKey"> {
  id?: string;
}

interface ToastManagerUpdateOptions<Data extends object>
  extends Partial<
    Omit<ToastObject<Data>, "height" | "id" | "limited" | "transitionStatus" | "updateKey">
  > {}

interface ToastManagerPromiseOptions<Value, Data extends object> {
  loading: string | ToastManagerUpdateOptions<Data>;
  success:
    | string
    | ToastManagerUpdateOptions<Data>
    | ((result: Value) => string | ToastManagerUpdateOptions<Data>);
  error:
    | string
    | ToastManagerUpdateOptions<Data>
    | ((error: unknown) => string | ToastManagerUpdateOptions<Data>);
}

interface ToastManagerEvent {
  action: "add" | "close" | "promise" | "update";
  options: unknown;
}

interface ToastManager<Data extends object = Record<string, unknown>> {
  " subscribe": (listener: (data: ToastManagerEvent) => void) => () => void;
  add: <T extends Data = Data>(options: ToastManagerAddOptions<T>) => string;
  close: (id?: string) => void;
  update: <T extends Data = Data>(id: string, updates: ToastManagerUpdateOptions<T>) => void;
  promise: <Value, T extends Data = Data>(
    promiseValue: Promise<Value>,
    options: ToastManagerPromiseOptions<Value, T>,
  ) => Promise<Value>;
}

interface UseToastManagerReturnValue<Data extends object = Record<string, unknown>> {
  readonly toasts: ToastObject<Data>[];
  add: ToastManager<Data>["add"];
  close: ToastManager<Data>["close"];
  update: ToastManager<Data>["update"];
  promise: ToastManager<Data>["promise"];
}

type InternalToastObject = ToastObject<object> & { kobalteId: number; renderKey: number };

interface ToastMetadata {
  behind: boolean;
  height: number;
  index: number;
  limited: boolean;
  offsetY: number;
}

interface ToastManagerInternals {
  readonly regionId: string;
  expanded: () => boolean;
  focused: () => boolean;
  getMetadata: (id: string) => ToastMetadata;
  getToast: (id: string) => InternalToastObject | undefined;
  getToasts: () => InternalToastObject[];
  handleUnmount: (id: string, renderKey: number) => void;
  notifyClose: (id: string) => void;
  notifyOpen: (id: string) => void;
  resolveToastId: (id: string) => number | undefined;
  restorePreviousFocus: () => boolean;
  savePreviousFocus: (element: HTMLElement | null) => void;
  setDefaultTimeout: (timeout: number) => void;
  setFocused: (focused: boolean) => void;
  setHeight: (id: string, height: number) => void;
  setHovered: (hovered: boolean) => void;
  setLimit: (limit: number) => void;
  setRootRef: (id: string, renderKey: number, element?: HTMLElement) => void;
  setSwipeDirection: (direction: ToastSwipeDirection) => void;
  setViewport: (element?: HTMLElement) => void;
  setWindowFocused: (focused: boolean) => void;
  swipeDirection: () => ToastSwipeDirection;
}

interface ToastTimer {
  remaining: number;
  startedAt: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

const managerInternalsKey = Symbol("toast-manager-internals");
type InternalToastManager = ToastManager<object> & {
  [managerInternalsKey]: ToastManagerInternals;
};

let managerCount = 0;
let toastCount = 0;
let toastRenderCount = 0;

function resolvePromiseOptions<Data extends object, Value>(
  option:
    | string
    | ToastManagerUpdateOptions<Data>
    | ((value: Value) => string | ToastManagerUpdateOptions<Data>),
  value: Value,
): ToastManagerUpdateOptions<Data> {
  const resolved = typeof option === "function" ? option(value) : option;
  return typeof resolved === "string" ? { description: resolved } : resolved;
}

function getManagerInternals(manager: ToastManager<object>) {
  const internals = (manager as InternalToastManager)[managerInternalsKey];

  if (!internals) {
    throw new Error("Toast managers must be created with createToastManager().");
  }

  return internals;
}

function createToastManager<Data extends object = Record<string, unknown>>(): ToastManager<Data> {
  const [toasts, setToasts] = createSignal<InternalToastObject[]>([]);
  const [hovered, setHovered] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const [limit, setLimit] = createSignal(3);
  const [defaultTimeout, setDefaultTimeout] = createSignal(5000);
  const [swipeDirection, setSwipeDirection] = createSignal<ToastSwipeDirection>("right");
  const [windowFocused, setWindowFocused] = createSignal(true);
  const listeners = new Set<(data: ToastManagerEvent) => void>();
  const closeFallbacks = new Map<string, ReturnType<typeof setTimeout>>();
  const closedToasts = new Set<string>();
  const retiredToasts = new Map<number, InternalToastObject>();
  const rootRefs = new Map<string, { element: HTMLElement; renderKey: number }>();
  const timers = new Map<string, ToastTimer>();
  let previousFocusElement: HTMLElement | null = null;
  let viewport: HTMLElement | undefined;
  const regionId = `toast-region-${managerCount++}`;

  const emit = (data: ToastManagerEvent) => {
    for (const listener of listeners) listener(data);
  };

  const getToast = (id: string) => toasts().find((item) => item.id === id);
  const timersPaused = () => hovered() || focused() || !windowFocused();

  const clearTimer = (id: string) => {
    const timer = timers.get(id);
    if (timer?.timeoutId !== undefined) clearTimeout(timer.timeoutId);
    timers.delete(id);
  };

  const startTimer = (id: string, timer: ToastTimer) => {
    if (timersPaused()) return;

    timer.startedAt = Date.now();
    timer.timeoutId = setTimeout(() => {
      timers.delete(id);
      manager.close(id);
    }, timer.remaining);
  };

  const scheduleTimer = (id: string, duration: number) => {
    const timer: ToastTimer = { remaining: duration, startedAt: Date.now() };
    timers.set(id, timer);
    startTimer(id, timer);
  };

  const pauseTimers = () => {
    const now = Date.now();

    for (const timer of timers.values()) {
      if (timer.timeoutId === undefined) continue;
      clearTimeout(timer.timeoutId);
      timer.timeoutId = undefined;
      timer.remaining = Math.max(0, timer.remaining - (now - timer.startedAt));
    }
  };

  const resumeTimers = () => {
    if (timersPaused()) return;

    for (const [id, timer] of timers) {
      if (timer.timeoutId === undefined) startTimer(id, timer);
    }
  };

  const syncPausedState = () => {
    if (timersPaused()) pauseTimers();
    else resumeTimers();
  };

  const restorePreviousFocus = () => {
    if (!previousFocusElement) return false;

    previousFocusElement.focus({ preventScroll: true });
    previousFocusElement = null;
    return true;
  };

  const handleFocusManagement = (id: string) => {
    const activeElement = viewport?.ownerDocument.activeElement;
    if (!viewport || !focused() || !viewport.contains(activeElement ?? null)) return;

    const currentIndex = toasts().findIndex((item) => item.id === id);
    const nextToast = [
      ...toasts().slice(currentIndex + 1),
      ...toasts().slice(0, Math.max(currentIndex, 0)).reverse(),
    ].find((item) => item.transitionStatus !== "ending" && item.id !== id && !isLimited(item.id));

    if (nextToast) rootRefs.get(nextToast.id)?.element.focus({ preventScroll: true });
    else restorePreviousFocus();
  };

  const isLimited = (id: string) => {
    const index = toasts().findIndex((item) => item.id === id);
    if (index === -1) return false;

    const activeToastsBefore = toasts()
      .slice(0, index)
      .filter((item) => item.transitionStatus !== "ending").length;
    return activeToastsBefore >= limit();
  };

  const removeToast = (id: string) => {
    clearTimer(id);
    const fallback = closeFallbacks.get(id);
    if (fallback) clearTimeout(fallback);
    closeFallbacks.delete(id);
    const item = getToast(id);
    if (!item) return;

    if (!closedToasts.has(id)) {
      closedToasts.add(id);
      item.onClose?.();
    }

    setToasts((items) => items.filter((toastItem) => toastItem.id !== id));
    item.onRemove?.();
    closedToasts.delete(id);
    if (toasts().length === 0) {
      setHovered(false);
      setFocused(false);
      syncPausedState();
    }
  };

  const notifyClose = (id: string) => {
    const item = getToast(id);
    if (!item || closedToasts.has(id)) return;

    clearTimer(id);
    closedToasts.add(id);
    setToasts((items) =>
      items.map((toastItem) =>
        toastItem.id === id ? { ...toastItem, transitionStatus: "ending" as const } : toastItem,
      ),
    );
    item.onClose?.();
    handleFocusManagement(id);
    if (toasts().every((toastItem) => toastItem.transitionStatus === "ending")) {
      setHovered(false);
      setFocused(false);
      syncPausedState();
    }
  };

  const notifyOpen = (id: string) => {
    const item = getToast(id);
    if (item?.transitionStatus !== "starting") return;

    setToasts((items) =>
      items.map((toastItem) =>
        toastItem.id === id ? { ...toastItem, transitionStatus: undefined } : toastItem,
      ),
    );
  };

  const renderToast = (id: string, renderKey: number): ToastPrimitive.ToastComponent => {
    return (rootProps) => {
      const item = () => {
        const toastItem = getToast(id);
        return toastItem?.renderKey === renderKey ? toastItem : retiredToasts.get(renderKey);
      };

      onCleanup(() => internals.handleUnmount(id, renderKey));

      return (
        <Show when={item()}>
          {(toastItem) => (
            <ManagedToast manager={internals} toast={toastItem()} toastId={rootProps.toastId} />
          )}
        </Show>
      );
    };
  };

  const update = (
    id: string,
    updates: ToastManagerUpdateOptions<object>,
    behavior: { resetTimer?: boolean } = {},
  ) => {
    const current = getToast(id);
    if (!current || current.transitionStatus === "ending") return;

    const next = {
      ...current,
      ...updates,
      id,
      transitionStatus: current.transitionStatus,
      updateKey: (current.updateKey ?? 0) + 1,
    };

    setToasts((items) => items.map((item) => (item.id === id ? next : item)));

    const previousTimeout = current.timeout ?? defaultTimeout();
    const nextTimeout = next.timeout ?? defaultTimeout();
    const timeoutUpdated = Object.hasOwn(updates, "timeout");
    const shouldHaveTimer = next.type !== "loading" && nextTimeout > 0;
    const hasTimer = timers.has(id);

    if (!shouldHaveTimer && hasTimer) {
      clearTimer(id);
    } else if (
      shouldHaveTimer &&
      (!hasTimer ||
        previousTimeout !== nextTimeout ||
        timeoutUpdated ||
        current.type === "loading" ||
        behavior.resetTimer)
    ) {
      clearTimer(id);
      scheduleTimer(id, nextTimeout);
    }

    emit({ action: "update", options: { ...updates, id } });
  };

  const manager = {
    " subscribe": (listener: (data: ToastManagerEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add: (options: ToastManagerAddOptions<object>) => {
      const id = options.id ?? `toast-${toastCount++}`;
      const existing = getToast(id);

      if (existing && existing.transitionStatus !== "ending") {
        const { id: _id, ...updates } = options;
        update(id, updates, { resetTimer: true });
        return id;
      }

      const renderKey = toastRenderCount++;

      const item: InternalToastObject = {
        ...options,
        id,
        kobalteId: -1,
        renderKey,
        transitionStatus: "starting",
        updateKey: 0,
      };

      if (existing) {
        const fallback = closeFallbacks.get(id);
        if (fallback) clearTimeout(fallback);
        closeFallbacks.delete(id);
        closedToasts.delete(id);
        retiredToasts.set(existing.renderKey, existing);
      }

      setToasts((items) => [item, ...items.filter((toastItem) => toastItem.id !== id)]);
      const kobalteId = ToastPrimitive.toaster.show(renderToast(id, renderKey), {
        region: regionId,
      });
      setToasts((items) =>
        items.map((toastItem) => (toastItem.id === id ? { ...toastItem, kobalteId } : toastItem)),
      );
      const duration = item.timeout ?? defaultTimeout();
      if (item.type !== "loading" && duration > 0) scheduleTimer(id, duration);
      emit({ action: "add", options: { ...options, id } });
      return id;
    },
    close: (id?: string) => {
      const items = id ? toasts().filter((item) => item.id === id) : toasts();

      for (const item of items) {
        if (closedToasts.has(item.id)) continue;
        clearTimer(item.id);
        notifyClose(item.id);
        closeFallbacks.set(
          item.id,
          setTimeout(() => removeToast(item.id), 1000),
        );
        ToastPrimitive.toaster.dismiss(item.kobalteId);
      }

      emit({ action: "close", options: { id } });
    },
    update,
    promise: async <Value,>(
      promiseValue: Promise<Value>,
      options: ToastManagerPromiseOptions<Value, object>,
    ) => {
      const id = manager.add({
        ...resolvePromiseOptions(options.loading, undefined),
        type: "loading",
      });

      emit({ action: "promise", options: { ...options, promise: promiseValue } });

      try {
        const value = await promiseValue;
        manager.update(id, {
          ...resolvePromiseOptions(options.success, value),
          type: "success",
        });
        return value;
      } catch (error) {
        manager.update(id, {
          ...resolvePromiseOptions(options.error, error),
          type: "error",
        });
        throw error;
      }
    },
  } as InternalToastManager;

  const internals: ToastManagerInternals = {
    regionId,
    expanded: () => hovered() || focused(),
    focused,
    getMetadata: (id) => {
      const activeToasts = toasts().filter((item) => item.transitionStatus !== "ending");
      const activeIndex = activeToasts.findIndex((item) => item.id === id);
      const item = getToast(id);
      const index =
        activeIndex === -1 ? toasts().findIndex((toastItem) => toastItem.id === id) : activeIndex;
      const offsetY = activeToasts
        .slice(0, Math.max(index, 0))
        .reduce((offset, toastItem) => offset + (toastItem.height ?? 0), 0);

      return {
        behind: index > 0,
        height: item?.height ?? 0,
        index: Math.max(index, 0),
        limited: isLimited(id),
        offsetY,
      };
    },
    getToast,
    getToasts: () => {
      return toasts().map((item) => ({
        ...item,
        limited: isLimited(item.id),
      }));
    },
    handleUnmount: (id, renderKey) => {
      if (getToast(id)?.renderKey === renderKey) removeToast(id);
      else retiredToasts.delete(renderKey);
    },
    notifyClose,
    notifyOpen,
    resolveToastId: (id) => getToast(id)?.kobalteId,
    restorePreviousFocus,
    savePreviousFocus: (element) => {
      previousFocusElement = element;
    },
    setDefaultTimeout,
    setFocused: (isFocused) => {
      setFocused(isFocused);
      syncPausedState();
    },
    setHeight: (id, height) => {
      setToasts((items) =>
        items.map((item) =>
          item.id === id && item.height !== height ? { ...item, height } : item,
        ),
      );
    },
    setHovered: (isHovered) => {
      setHovered(isHovered);
      syncPausedState();
    },
    setLimit,
    setRootRef: (id, renderKey, element) => {
      if (element) rootRefs.set(id, { element, renderKey });
      else if (rootRefs.get(id)?.renderKey === renderKey) rootRefs.delete(id);
    },
    setSwipeDirection,
    setViewport: (element) => {
      viewport = element;
    },
    setWindowFocused: (isFocused) => {
      setWindowFocused(isFocused);
      syncPausedState();
    },
    swipeDirection,
  };

  manager[managerInternalsKey] = internals;
  return manager as unknown as ToastManager<Data>;
}

const toast = createToastManager();

interface ToastProviderContextValue {
  manager: ToastManagerInternals;
  timeout: () => number;
  toastManager: ToastManager<object>;
}

const ToastProviderContext = createContext<ToastProviderContextValue>();

function useToastProviderContext() {
  const context = useContext(ToastProviderContext);
  if (!context) throw new Error("Toast components must be used within <ToastProvider>.");
  return context;
}

interface ToastProviderProps {
  children?: JSX.Element;
  limit?: number;
  timeout?: number;
  toastManager?: ToastManager<object>;
}

function ToastProvider(props: ToastProviderProps) {
  const localManager = createToastManager<object>();
  const mergedProps = mergeProps({ limit: 3, timeout: 5000 }, props);
  const toastManager = () => mergedProps.toastManager ?? localManager;
  const manager = () => getManagerInternals(toastManager());

  createEffect(() => {
    manager().setDefaultTimeout(mergedProps.timeout);
    manager().setLimit(mergedProps.limit);
  });

  return (
    <ToastProviderContext.Provider
      value={{
        get manager() {
          return manager();
        },
        timeout: () => mergedProps.timeout,
        get toastManager() {
          return toastManager();
        },
      }}
    >
      {mergedProps.children}
    </ToastProviderContext.Provider>
  );
}

type ToastPortalProps = ComponentProps<typeof Portal> & { class?: string };

function ToastPortal(props: ToastPortalProps) {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <Portal {...others}>
      <div data-slot="toast-portal" class={cn("contents", local.class)}>
        {local.children}
      </div>
    </Portal>
  );
}

type ToastViewportProps = Omit<
  PolymorphicProps<"div", ToastPrimitive.ToastRegionProps<"div">>,
  "duration" | "limit" | "regionId"
>;

function callEventHandler<T extends Element, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
) {
  if (typeof handler === "function") handler(event);
  else handler?.[0](handler[1], event);
}

function mergeStyle(
  variables: Record<`--${string}`, number | string | undefined>,
  style: JSX.CSSProperties | string | undefined,
): JSX.CSSProperties | string {
  if (typeof style !== "string") return { ...variables, ...style } as JSX.CSSProperties;

  const variableStyle = Object.entries(variables)
    .filter((entry) => entry[1] !== undefined)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  return `${variableStyle};${style}`;
}

function ToastViewport(props: ToastViewportProps) {
  const context = useToastProviderContext();
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "onFocusIn",
    "onFocusOut",
    "onKeyDown",
    "onPointerEnter",
    "onPointerLeave",
    "ref",
    "style",
  ]);
  let viewportRef: HTMLElement | undefined;
  const frontmostHeight = () =>
    context.manager.getToasts().find((toastItem) => toastItem.transitionStatus !== "ending")
      ?.height;
  const highPriorityToasts = () =>
    context.manager
      .getToasts()
      .filter(
        (toastItem) => toastItem.priority === "high" && toastItem.transitionStatus !== "ending",
      );
  const focusableElements = () => {
    if (!viewportRef) return [];

    const toastOrder = new Map(
      context.manager
        .getToasts()
        .filter((toastItem) => toastItem.transitionStatus !== "ending" && !toastItem.limited)
        .map((toastItem, index) => [toastItem.id, index]),
    );

    return Array.from(
      viewportRef.querySelectorAll<HTMLElement>(
        'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
      ),
    )
      .map((element, domIndex) => ({
        domIndex,
        element,
        toastIndex: toastOrder.get(
          element.closest<HTMLElement>('[data-slot="toast"]')?.dataset.toastId ?? "",
        ),
      }))
      .filter((item) => item.toastIndex !== undefined && !item.element.closest("[inert]"))
      .sort((a, b) => (a.toastIndex ?? 0) - (b.toastIndex ?? 0) || a.domIndex - b.domIndex)
      .map((item) => item.element);
  };

  onMount(() => {
    const document = viewportRef?.ownerDocument;
    if (!document) return;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const hasActiveToasts = context.manager
        .getToasts()
        .some((toastItem) => toastItem.transitionStatus !== "ending");

      if (
        event.altKey &&
        event.code === "KeyT" &&
        event.target !== viewportRef &&
        hasActiveToasts
      ) {
        context.manager.savePreviousFocus(document.activeElement as HTMLElement | null);
        return;
      }

      if (event.key !== "F6" || event.target === viewportRef || !hasActiveToasts) {
        return;
      }

      event.preventDefault();
      context.manager.savePreviousFocus(document.activeElement as HTMLElement | null);
      viewportRef?.focus({ preventScroll: true });
    };

    const window = document.defaultView;
    const handleWindowBlur = () => context.manager.setWindowFocused(false);
    const handleWindowFocus = () => context.manager.setWindowFocused(true);
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" && !viewportRef?.contains(event.target as Node | null)) {
        context.manager.setHovered(false);
        context.manager.setFocused(false);
      }
    };

    context.manager.setWindowFocused(document.hasFocus());
    document.addEventListener("keydown", handleGlobalKeyDown, true);
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    window?.addEventListener("blur", handleWindowBlur);
    window?.addEventListener("focus", handleWindowFocus);
    onCleanup(() => {
      context.manager.setViewport(undefined);
      document.removeEventListener("keydown", handleGlobalKeyDown, true);
      document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
      window?.removeEventListener("blur", handleWindowBlur);
      window?.removeEventListener("focus", handleWindowFocus);
    });
  });

  return (
    <>
      <ToastPrimitive.Region
        data-slot="toast-viewport"
        class={cn(
          "pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-sm outline-none sm:right-4 sm:left-auto sm:mx-0 sm:w-full",
          local.class,
        )}
        duration={context.timeout()}
        limit={Number.MAX_SAFE_INTEGER}
        regionId={context.manager.regionId}
        swipeDirection={context.manager.swipeDirection()}
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic={false}
        aria-relevant="additions text"
        ref={(element) => {
          viewportRef = element;
          context.manager.setViewport(element);
          setElementRef(local.ref, element);
        }}
        style={mergeStyle(
          {
            "--toast-frontmost-height": frontmostHeight() ? `${frontmostHeight()}px` : undefined,
          },
          local.style,
        )}
        onPointerEnter={(event) => {
          callEventHandler(local.onPointerEnter, event);
          context.manager.setHovered(true);
        }}
        onPointerLeave={(event) => {
          callEventHandler(local.onPointerLeave, event);
          context.manager.setHovered(false);
        }}
        onFocusIn={(event) => {
          callEventHandler(local.onFocusIn, event);
          if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) {
            context.manager.setFocused(true);
          }
        }}
        onFocusOut={(event) => {
          callEventHandler(local.onFocusOut, event);
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            context.manager.setFocused(false);
          }
        }}
        onKeyDown={(event) => {
          callEventHandler(local.onKeyDown, event);
          if (event.defaultPrevented || event.key !== "Tab") return;

          const focusable = focusableElements();
          const currentIndex = focusable.indexOf(event.target as HTMLElement);
          const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
          const nextFocusable = focusable[nextIndex];

          if (nextFocusable) {
            event.preventDefault();
            nextFocusable.focus({ preventScroll: true });
          } else if (
            (event.shiftKey && (currentIndex === 0 || currentIndex === -1)) ||
            (!event.shiftKey && currentIndex === focusable.length - 1)
          ) {
            if (context.manager.restorePreviousFocus()) event.preventDefault();
          }
        }}
        {...others}
      >
        {local.children}
      </ToastPrimitive.Region>
      <Show when={!context.manager.focused() && highPriorityToasts().length > 0}>
        <div class="sr-only">
          <Index each={highPriorityToasts()}>
            {(toastItem) => (
              <div role="alert" aria-atomic="true">
                <div>{toastItem().title}</div>
                <div>{toastItem().description}</div>
              </div>
            )}
          </Index>
        </div>
      </Show>
    </>
  );
}

type ToastProps = Omit<
  PolymorphicProps<"div", ToastPrimitive.ToastRootProps<"div">>,
  "duration" | "persistent" | "priority" | "toastId"
> & {
  swipeDirection?: ToastSwipeDirection | ToastSwipeDirection[];
  toast: ToastObject<object>;
};

interface ToastRootViewProps extends ToastProps {
  manager: ToastManagerInternals;
  toastId: number;
}

function toastStyle(
  metadata: ToastMetadata,
  style: JSX.CSSProperties | string | undefined,
): JSX.CSSProperties | string {
  return mergeStyle(
    {
      "--toast-height": metadata.height ? `${metadata.height}px` : undefined,
      "--toast-index": metadata.index,
      "--toast-offset-y": `${metadata.offsetY}px`,
      "--toast-swipe-movement-x": "var(--kb-toast-swipe-move-x, 0px)",
      "--toast-swipe-movement-y": "var(--kb-toast-swipe-move-y, 0px)",
    },
    style,
  );
}

function setElementRef(ref: unknown, element: HTMLElement) {
  if (typeof ref === "function") (ref as (element: HTMLElement) => void)(element);
}

function ToastRootView(props: ToastRootViewProps) {
  const [local, others] = splitProps(props, [
    "class",
    "manager",
    "onEscapeKeyDown",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onSwipeEnd",
    "ref",
    "style",
    "toast",
    "toastId",
    "swipeDirection",
  ]);
  const isCurrentToast = () => {
    if (!("renderKey" in local.toast)) return true;
    return local.manager.getToast(local.toast.id)?.renderKey === local.toast.renderKey;
  };
  const currentToast = () =>
    isCurrentToast() ? (local.manager.getToast(local.toast.id) ?? local.toast) : local.toast;
  const metadata = () => {
    const toastMetadata = local.manager.getMetadata(local.toast.id);
    return isCurrentToast() ? toastMetadata : { ...toastMetadata, limited: true };
  };
  let rootRef: HTMLElement | undefined;
  let pointerStart: { x: number; y: number } | undefined;
  let lockedSwipeDirection: ToastSwipeDirection | undefined;

  const swipeDirections = (): ToastSwipeDirection[] => {
    const directions = local.swipeDirection ?? ["down", "right"];
    return Array.isArray(directions) ? (directions as ToastSwipeDirection[]) : [directions];
  };

  const preferredSwipeDirection = (): ToastSwipeDirection => {
    const directions = swipeDirections();
    return directions.includes("right") ? "right" : (directions[0] ?? "right");
  };

  const measure = () => {
    if (rootRef && isCurrentToast()) {
      local.manager.setHeight(local.toast.id, rootRef.getBoundingClientRect().height);
    }
  };

  onMount(() => {
    measure();
    local.manager.notifyOpen(local.toast.id);
    if (!rootRef) return;

    const renderKey =
      "renderKey" in local.toast
        ? local.toast.renderKey
        : local.manager.getToast(local.toast.id)?.renderKey;
    if (renderKey !== undefined) local.manager.setRootRef(local.toast.id, renderKey, rootRef);

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    resizeObserver?.observe(rootRef);

    const closeObserver =
      typeof MutationObserver === "undefined"
        ? undefined
        : new MutationObserver(() => {
            if (isCurrentToast() && rootRef?.hasAttribute("data-closed")) {
              local.manager.notifyClose(local.toast.id);
            }
          });
    closeObserver?.observe(rootRef, { attributeFilter: ["data-closed"] });

    onCleanup(() => {
      if (renderKey !== undefined) local.manager.setRootRef(local.toast.id, renderKey);
      resizeObserver?.disconnect();
      closeObserver?.disconnect();
    });
  });

  // Base places polite announcements on the viewport and high-priority announcements in a
  // dedicated visually hidden alert. Disable Kobalte's root live region to avoid duplicates.
  return (
    <ToastPrimitive.Root
      as="div"
      ref={(element) => {
        rootRef = element;
        setElementRef(local.ref, element);
      }}
      toastId={local.toastId}
      priority={currentToast().priority ?? "low"}
      duration={currentToast().timeout}
      persistent
      role={currentToast().priority === "high" ? "alertdialog" : "dialog"}
      aria-modal={false}
      aria-hidden={
        currentToast().priority === "high" && !local.manager.focused() ? true : undefined
      }
      {...{ "aria-live": undefined, "aria-atomic": undefined }}
      data-slot="toast"
      data-toast-id={local.toast.id}
      data-type={currentToast().type}
      data-expanded={local.manager.expanded() ? "" : undefined}
      data-limited={metadata().limited ? "" : undefined}
      inert={metadata().limited ? true : undefined}
      style={toastStyle(metadata(), local.style)}
      class={cn(
        "z-toast group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom border bg-popover text-popover-foreground shadow-lg will-change-transform outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms] motion-reduce:animate-none motion-reduce:transition-none",
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-[expanded]:h-(--toast-height) data-[expanded]:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-[limited]:opacity-0 data-[opened]:animate-in data-[opened]:slide-in-from-bottom-full data-[closed]:animate-out",
        "[&[data-closed]:not([data-swipe=end]):not([data-limited])]:[transform:translateY(150%)]",
        "data-[closed]:data-[swipe=end]:data-[swipe-direction=down]:[transform:translateY(calc(var(--kb-toast-swipe-end-y)+150%))]",
        "data-[closed]:data-[swipe=end]:data-[swipe-direction=left]:[transform:translateX(calc(var(--kb-toast-swipe-end-x)-150%))_translateY(var(--offset-y))]",
        "data-[closed]:data-[swipe=end]:data-[swipe-direction=right]:[transform:translateX(calc(var(--kb-toast-swipe-end-x)+150%))_translateY(var(--offset-y))]",
        "data-[closed]:data-[swipe=end]:data-[swipe-direction=up]:[transform:translateY(calc(var(--kb-toast-swipe-end-y)-150%))]",
        "data-[swipe=move]:transition-none data-[swipe=cancel]:transition-[transform_200ms_ease-out]",
        local.class,
      )}
      onEscapeKeyDown={(event) => {
        local.onEscapeKeyDown?.(event);
        if (!event.defaultPrevented && isCurrentToast()) {
          local.manager.notifyClose(local.toast.id);
        }
      }}
      onPointerDown={(event) => {
        callEventHandler(local.onPointerDown, event);
        if (event.button !== 0) return;

        pointerStart = { x: event.clientX, y: event.clientY };
        lockedSwipeDirection = undefined;
        local.manager.setSwipeDirection(preferredSwipeDirection());
      }}
      onPointerMove={(event) => {
        callEventHandler(local.onPointerMove, event);
        if (!pointerStart || lockedSwipeDirection) return;

        const deltaX = event.clientX - pointerStart.x;
        const deltaY = event.clientY - pointerStart.y;
        const directions = swipeDirections();
        const candidate: ToastSwipeDirection =
          Math.abs(deltaX) >= Math.abs(deltaY)
            ? deltaX >= 0
              ? "right"
              : "left"
            : deltaY >= 0
              ? "down"
              : "up";

        if (!directions.includes(candidate)) {
          local.manager.setSwipeDirection(
            Math.abs(deltaX) >= Math.abs(deltaY)
              ? deltaY >= 0
                ? "up"
                : "down"
              : deltaX >= 0
                ? "left"
                : "right",
          );
          return;
        }

        lockedSwipeDirection = candidate;
        local.manager.setSwipeDirection(candidate);
      }}
      onPointerUp={(event) => {
        callEventHandler(local.onPointerUp, event);
        pointerStart = undefined;
      }}
      onSwipeEnd={(event) => {
        local.onSwipeEnd?.(event);
        if (!event.defaultPrevented && isCurrentToast()) {
          local.manager.notifyClose(local.toast.id);
        }
      }}
      {...others}
    />
  );
}

interface ToastItemContextValue {
  manager: ToastManagerInternals;
  toast: () => InternalToastObject;
}

const ToastItemContext = createContext<ToastItemContextValue>();

function useToastItemContext() {
  const context = useContext(ToastItemContext);
  if (!context) throw new Error("Toast parts must be used within <Toast>.");
  return context;
}

function Toast(props: ToastProps) {
  const provider = useToastProviderContext();
  const [local, others] = splitProps(props, ["toast"]);
  const toastId = () => provider.manager.resolveToastId(local.toast.id);
  const value: ToastItemContextValue = {
    manager: provider.manager,
    toast: () => provider.manager.getToast(local.toast.id) ?? local.toast,
  };

  return (
    <Show when={toastId()}>
      {(resolvedToastId) => (
        <ToastItemContext.Provider value={value}>
          <ToastRootView
            {...others}
            manager={provider.manager}
            toast={local.toast}
            toastId={resolvedToastId()}
          />
        </ToastItemContext.Provider>
      )}
    </Show>
  );
}

type ToastContentProps = ComponentProps<"div">;

function ToastContent(props: ToastContentProps) {
  const context = useToastItemContext();
  const [local, others] = splitProps(props, ["class"]);
  const metadata = () => context.manager.getMetadata(context.toast().id);

  return (
    <div
      data-slot="toast-content"
      data-behind={metadata().behind ? "" : undefined}
      data-expanded={context.manager.expanded() ? "" : undefined}
      class={cn(
        "flex h-full items-center gap-3 overflow-hidden p-4 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-[behind]:opacity-0 data-[expanded]:opacity-100 motion-reduce:transition-none",
        local.class,
      )}
      {...others}
    />
  );
}

type ToastTitleProps = PolymorphicProps<"h2", ToastPrimitive.ToastTitleProps<"h2">> &
  Pick<ComponentProps<"h2">, "children" | "class">;

function ToastTitle(props: ToastTitleProps) {
  const context = useToastItemContext();
  const [local, others] = splitProps(props, ["children", "class"]);
  const content = () => local.children ?? context.toast().title;

  return (
    <Show when={content()}>
      {(children) => (
        <ToastPrimitive.Title
          as="h2"
          data-slot="toast-title"
          data-type={context.toast().type}
          class={cn("text-sm font-medium", local.class)}
          {...others}
        >
          {children()}
        </ToastPrimitive.Title>
      )}
    </Show>
  );
}

type ToastDescriptionProps = PolymorphicProps<"p", ToastPrimitive.ToastDescriptionProps<"p">> &
  Pick<ComponentProps<"p">, "children" | "class">;

function ToastDescription(props: ToastDescriptionProps) {
  const context = useToastItemContext();
  const [local, others] = splitProps(props, ["children", "class"]);
  const content = () => local.children ?? context.toast().description;

  return (
    <Show when={content()}>
      {(children) => (
        <ToastPrimitive.Description
          as="p"
          data-slot="toast-description"
          data-type={context.toast().type}
          class={cn("text-sm text-muted-foreground", local.class)}
          {...others}
        >
          {children()}
        </ToastPrimitive.Description>
      )}
    </Show>
  );
}

type ToastActionProps = ButtonProps & Pick<ComponentProps<"button">, "children">;

const emptyActionProps: ComponentProps<"button"> = {};

function ToastAction(props: ToastActionProps) {
  const context = useToastItemContext();
  const mergedProps = mergeProps({ size: "sm", variant: "outline" } as ToastActionProps, props);
  const [local, others] = splitProps(mergedProps, ["children", "class", "size", "variant"]);
  const actionProps = () => context.toast().actionProps ?? emptyActionProps;

  return (
    <Show when={actionProps()} keyed>
      {(resolvedActionProps) => {
        const [actionLocal, actionOthers] = splitProps(resolvedActionProps, ["children", "class"]);
        const content = () => actionLocal.children ?? local.children;

        return (
          <Show when={content()}>
            {(children) => (
              <Button
                data-slot="toast-action"
                data-type={context.toast().type}
                class={cn("shrink-0", local.class, actionLocal.class)}
                size={local.size}
                variant={local.variant}
                {...others}
                {...actionOthers}
              >
                {children()}
              </Button>
            )}
          </Show>
        );
      }}
    </Show>
  );
}

type ToastCloseProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  ToastPrimitive.ToastCloseButtonProps<T>
> &
  Pick<ButtonProps, "class" | "size" | "variant"> &
  Pick<ComponentProps<T>, "children">;

function ToastClose<T extends ValidComponent = "button">(props: ToastCloseProps<T>) {
  const context = useToastItemContext();
  const mergedProps = mergeProps(
    { "aria-label": "Close toast", size: "icon-sm", variant: "ghost" } as ToastCloseProps,
    props,
  );
  const [local, others] = splitProps(mergedProps as ToastCloseProps, [
    "children",
    "class",
    "onBlur",
    "onClick",
    "onFocus",
    "size",
    "variant",
  ]);
  const [hasFocus, setHasFocus] = createSignal(false);

  return (
    <ToastPrimitive.CloseButton
      as={Button}
      data-slot="toast-close"
      data-type={context.toast().type}
      aria-hidden={!context.manager.expanded() && !hasFocus()}
      class={cn(
        "relative shrink-0 text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:text-foreground",
        local.class,
      )}
      size={local.size}
      variant={local.variant}
      onClick={(event) => {
        callEventHandler(local.onClick, event);
        context.manager.notifyClose(context.toast().id);
      }}
      onFocus={(event) => {
        callEventHandler(local.onFocus, event);
        setHasFocus(true);
      }}
      onBlur={(event) => {
        callEventHandler(local.onBlur, event);
        setHasFocus(false);
      }}
      {...others}
    >
      {local.children ?? <X aria-hidden="true" />}
    </ToastPrimitive.CloseButton>
  );
}

function ToastIcon(props: { type?: string }) {
  const [local] = splitProps(props, ["type"]);

  return (
    <Switch>
      <Match when={local.type === "success"}>
        <CircleCheck aria-hidden="true" />
      </Match>
      <Match when={local.type === "info"}>
        <Info aria-hidden="true" />
      </Match>
      <Match when={local.type === "warning"}>
        <TriangleAlert aria-hidden="true" />
      </Match>
      <Match when={local.type === "error"}>
        <OctagonX class="text-destructive" aria-hidden="true" />
      </Match>
      <Match when={local.type === "loading"}>
        <LoaderCircle class="animate-spin" aria-hidden="true" />
      </Match>
    </Switch>
  );
}

function ToastList() {
  return (
    <ToastPrimitive.List as="div" data-slot="toast-list" class="m-0 list-none p-0 outline-none" />
  );
}

function ManagedToast(props: {
  manager: ToastManagerInternals;
  toast: InternalToastObject;
  toastId: number;
}) {
  const [local] = splitProps(props, ["manager", "toast", "toastId"]);
  const value: ToastItemContextValue = {
    manager: local.manager,
    toast: () => {
      const currentToast = local.manager.getToast(local.toast.id);
      return currentToast?.renderKey === local.toast.renderKey ? currentToast : local.toast;
    },
  };
  const hasIcon = () =>
    ["error", "info", "loading", "success", "warning"].includes(value.toast().type ?? "");

  return (
    <ToastItemContext.Provider value={value}>
      <ToastRootView manager={local.manager} toast={local.toast} toastId={local.toastId}>
        <ToastContent>
          <Show when={hasIcon()}>
            <span
              data-slot="toast-icon"
              class="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
            >
              <ToastIcon type={value.toast().type} />
            </span>
          </Show>
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <ToastTitle />
            <ToastDescription />
          </div>
          <ToastAction />
          <ToastClose />
        </ToastContent>
      </ToastRootView>
    </ToastItemContext.Provider>
  );
}

type ToasterProps = ToastProviderProps;

function Toaster(props: ToasterProps) {
  const mergedProps = mergeProps({ toastManager: toast as ToastManager<object> }, props);
  const [local, others] = splitProps(mergedProps, ["children", "toastManager"]);

  return (
    <ToastProvider toastManager={local.toastManager} {...others}>
      {local.children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

function useToastManager<
  Data extends object = Record<string, unknown>,
>(): UseToastManagerReturnValue<Data> {
  const context = useToastProviderContext();
  const manager = context.toastManager as ToastManager<Data>;

  return {
    get toasts() {
      return context.manager.getToasts() as ToastObject<Data>[];
    },
    add: manager.add,
    close: manager.close,
    update: manager.update,
    promise: manager.promise,
  };
}

export type {
  ToastManager,
  ToastManagerAddOptions,
  ToastManagerPromiseOptions,
  ToastManagerUpdateOptions,
  ToastObject,
  ToastProps,
};
export {
  createToastManager,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  Toaster,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toast,
  useToastManager,
};
