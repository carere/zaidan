/*
 * Portions of this file are based on Base UI's Slider.
 * MIT Licensed, Copyright (c) 2019 Material-UI SAS.
 */

import {
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  Index,
  type JSX,
  onCleanup,
  onMount,
  splitProps,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";

type SliderValue = number | readonly number[];
type SliderChangeReason = "drag" | "input-change" | "keyboard" | "none" | "track-press";
type SliderCommitReason = SliderChangeReason;
type SliderCollisionBehavior = "none" | "push" | "swap";
type SliderThumbAlignment = "center" | "edge" | "edge-client-only";

type SliderChangeDetails = {
  activeThumbIndex: number;
  allowPropagation: () => void;
  cancel: () => void;
  event: Event;
  readonly isCanceled: boolean;
  readonly isPropagationAllowed: boolean;
  reason: SliderChangeReason;
  trigger: Element | undefined;
};

type SliderCommitDetails = {
  event: Event;
  reason: SliderCommitReason;
};

type SliderProps<T extends ValidComponent = "div", Value extends SliderValue = SliderValue> = Omit<
  ComponentProps<T>,
  "children" | "defaultValue" | "form" | "ref" | "value"
> & {
  as?: T;
  defaultValue?: Value;
  disabled?: boolean;
  form?: string;
  format?: Intl.NumberFormatOptions;
  largeStep?: number;
  locale?: Intl.LocalesArgument;
  max?: number;
  min?: number;
  minStepsBetweenValues?: number;
  name?: string;
  onValueChange?: (
    value: Value extends number ? number : Value,
    details: SliderChangeDetails,
  ) => void;
  onValueCommitted?: (
    value: Value extends number ? number : Value,
    details: SliderCommitDetails,
  ) => void;
  orientation?: "horizontal" | "vertical";
  ref?: (element: HTMLElement) => void;
  step?: number;
  thumbAlignment?: SliderThumbAlignment;
  thumbCollisionBehavior?: SliderCollisionBehavior;
  value?: Value;
};

type CollisionResult = {
  didSwap: boolean;
  thumbIndex: number;
  value: number[];
};

type ResolveCollisionOptions = {
  behavior: SliderCollisionBehavior;
  currentValues: number[];
  initialValues: number[] | null;
  max: number;
  min: number;
  minStepsBetweenValues: number;
  nextValue: number;
  pressedIndex: number;
  step: number;
  values: number[];
};

const visuallyHiddenStyles: JSX.CSSProperties = {
  border: "0",
  clip: "rect(0 0 0 0)",
  "clip-path": "inset(50%)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  "white-space": "nowrap",
  width: "1px",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDecimalPrecision(value: number) {
  if (value === 0) return 0;

  if (Math.abs(value) < 1) {
    const [mantissa = "", exponent = "0"] = value.toExponential().split("e-");
    return (mantissa.split(".")[1]?.length ?? 0) + Number.parseInt(exponent, 10);
  }

  return value.toString().split(".")[1]?.length ?? 0;
}

function roundValueToStep(value: number, step: number, min: number) {
  const nearest = Math.round((value - min) / step) * step + min;
  return Number(nearest.toFixed(Math.max(getDecimalPrecision(step), getDecimalPrecision(min))));
}

function getNewValue(
  thumbValue: number,
  increment: number,
  direction: -1 | 1,
  min: number,
  max: number,
) {
  const value = direction === 1 ? thumbValue + increment : thumbValue - increment;
  const precision = Math.max(
    getDecimalPrecision(thumbValue),
    getDecimalPrecision(increment),
    getDecimalPrecision(min),
  );
  return clamp(Number(value.toFixed(precision)), min, max);
}

function areValuesEqual(first: SliderValue, second: SliderValue) {
  if (typeof first === "number" && typeof second === "number") return first === second;
  if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) {
    return false;
  }
  return first.every((value, index) => value === second[index]);
}

function validateMinimumDistance(values: number[], step: number, minStepsBetweenValues: number) {
  if (values.length < 2) return true;
  const minimumDistance = step * minStepsBetweenValues;
  return values.every((value, index) => {
    const nextValue = values[index + 1];
    return nextValue === undefined || Math.abs(value - nextValue) >= minimumDistance;
  });
}

// Kobalte does not support Base UI's pointer collision modes, and Corvu has no
// slider primitive. These framework-agnostic collision rules preserve the
// pinned Base UI 1.6.0 contract in Solid.
function getPushedThumbValues(options: {
  index: number;
  initialValues?: number[];
  max: number;
  min: number;
  minStepsBetweenValues: number;
  nextValue: number;
  step: number;
  values: number[];
}) {
  const {
    index,
    initialValues = options.values,
    max,
    min,
    minStepsBetweenValues,
    nextValue,
    step,
  } = options;
  const nextValues = options.values.slice();
  if (nextValues.length === 0) return nextValues;

  const minimumDistance = step * minStepsBetweenValues;
  const lastIndex = nextValues.length - 1;
  nextValues[index] = clamp(
    nextValue,
    min + index * minimumDistance,
    max - (lastIndex - index) * minimumDistance,
  );

  for (let currentIndex = index + 1; currentIndex <= lastIndex; currentIndex += 1) {
    const minimum = nextValues[currentIndex - 1] + minimumDistance;
    const maximum = max - (lastIndex - currentIndex) * minimumDistance;
    const initialValue = initialValues[currentIndex] ?? nextValues[currentIndex];
    let candidate = Math.max(nextValues[currentIndex], minimum);
    if (initialValue < candidate) candidate = Math.max(initialValue, minimum);
    nextValues[currentIndex] = clamp(candidate, minimum, maximum);
  }

  for (let currentIndex = index - 1; currentIndex >= 0; currentIndex -= 1) {
    const maximum = nextValues[currentIndex + 1] - minimumDistance;
    const minimum = min + currentIndex * minimumDistance;
    const initialValue = initialValues[currentIndex] ?? nextValues[currentIndex];
    let candidate = Math.min(nextValues[currentIndex], maximum);
    if (initialValue > candidate) candidate = Math.min(initialValue, maximum);
    nextValues[currentIndex] = clamp(candidate, minimum, maximum);
  }

  return nextValues.map((value) => Number(value.toFixed(12)));
}

function resolveThumbCollision(options: ResolveCollisionOptions): CollisionResult {
  const {
    behavior,
    currentValues,
    initialValues,
    max,
    min,
    minStepsBetweenValues,
    nextValue,
    pressedIndex,
    step,
    values,
  } = options;
  const activeValues = currentValues ?? values;
  const baselineValues = initialValues ?? values;
  const minimumDistance = step * minStepsBetweenValues;

  if (activeValues.length < 2) {
    return { didSwap: false, thumbIndex: 0, value: [nextValue] };
  }

  if (behavior === "push") {
    return {
      didSwap: false,
      thumbIndex: pressedIndex,
      value: getPushedThumbValues({
        index: pressedIndex,
        max,
        min,
        minStepsBetweenValues,
        nextValue,
        step,
        values: activeValues,
      }),
    };
  }

  const candidateValues = activeValues.slice();
  const previousNeighbor = candidateValues[pressedIndex - 1];
  const nextNeighbor = candidateValues[pressedIndex + 1];
  const lowerBound = previousNeighbor === undefined ? min : previousNeighbor + minimumDistance;
  const upperBound = nextNeighbor === undefined ? max : nextNeighbor - minimumDistance;
  const constrainedValue = Number(clamp(nextValue, lowerBound, upperBound).toFixed(12));
  candidateValues[pressedIndex] = constrainedValue;

  if (behavior === "none") {
    return { didSwap: false, thumbIndex: pressedIndex, value: candidateValues };
  }

  const pressedInitialValue = activeValues[pressedIndex];
  const shouldSwapForward =
    nextValue > pressedInitialValue &&
    nextNeighbor !== undefined &&
    nextValue >= nextNeighbor - 1e-7;
  const shouldSwapBackward =
    nextValue < pressedInitialValue &&
    previousNeighbor !== undefined &&
    nextValue <= previousNeighbor + 1e-7;

  if (!shouldSwapForward && !shouldSwapBackward) {
    return { didSwap: false, thumbIndex: pressedIndex, value: candidateValues };
  }

  const targetIndex = shouldSwapForward ? pressedIndex + 1 : pressedIndex - 1;
  const initialValuesForPush = candidateValues.map((_, index) => {
    if (index === pressedIndex) return constrainedValue;
    return baselineValues[index] ?? activeValues[index];
  });
  const nextValueForTarget = shouldSwapForward
    ? Math.max(nextValue, candidateValues[targetIndex])
    : Math.min(nextValue, candidateValues[targetIndex]);
  const adjustedValues = getPushedThumbValues({
    index: targetIndex,
    initialValues: initialValuesForPush,
    max,
    min,
    minStepsBetweenValues,
    nextValue: nextValueForTarget,
    step,
    values: candidateValues,
  });
  const neighborIndex = shouldSwapForward ? targetIndex - 1 : targetIndex + 1;

  if (neighborIndex >= 0 && neighborIndex < adjustedValues.length) {
    const previousValue = adjustedValues[neighborIndex - 1];
    const followingValue = adjustedValues[neighborIndex + 1];
    let neighborMinimum = previousValue === undefined ? min : previousValue + minimumDistance;
    neighborMinimum = Math.max(neighborMinimum, min + neighborIndex * minimumDistance);
    let neighborMaximum = followingValue === undefined ? max : followingValue - minimumDistance;
    neighborMaximum = Math.min(
      neighborMaximum,
      max - (adjustedValues.length - 1 - neighborIndex) * minimumDistance,
    );
    adjustedValues[neighborIndex] = Number(
      clamp(constrainedValue, neighborMinimum, neighborMaximum).toFixed(12),
    );
  }

  return { didSwap: true, thumbIndex: targetIndex, value: adjustedValues };
}

function cloneEventWithTarget(event: Event, value: SliderValue, name: string | undefined) {
  try {
    const EventConstructor = event.constructor as new (type: string, eventInit?: Event) => Event;
    const clonedEvent = new EventConstructor(event.type, event);
    Object.defineProperty(clonedEvent, "target", {
      configurable: true,
      value: { name, value },
    });
    return clonedEvent;
  } catch {
    return event;
  }
}

function createChangeDetails(
  reason: SliderChangeReason,
  event: Event,
  activeThumbIndex: number,
  value: SliderValue,
  name: string | undefined,
): SliderChangeDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    activeThumbIndex,
    allowPropagation: () => {
      propagationAllowed = true;
    },
    cancel: () => {
      canceled = true;
    },
    event: cloneEventWithTarget(event, value, name),
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    reason,
    trigger: undefined,
  };
}

const Slider = <T extends ValidComponent = "div", Value extends SliderValue = SliderValue>(
  props: SliderProps<T, Value>,
) => {
  const [local, others] = splitProps(props as SliderProps, [
    "as",
    "aria-label",
    "aria-labelledby",
    "class",
    "defaultValue",
    "disabled",
    "form",
    "format",
    "id",
    "largeStep",
    "locale",
    "max",
    "min",
    "minStepsBetweenValues",
    "name",
    "onValueChange",
    "onValueCommitted",
    "orientation",
    "ref",
    "step",
    "thumbAlignment",
    "thumbCollisionBehavior",
    "value",
  ]);
  const generatedId = `slider-${createUniqueId()}`;
  const id = () => local.id ?? generatedId;
  const min = () => local.min ?? 0;
  const max = () => local.max ?? 100;
  const step = () => local.step ?? 1;
  const largeStep = () => local.largeStep ?? 10;
  const minimumSteps = () => local.minStepsBetweenValues ?? 0;
  const orientation = () => local.orientation ?? "horizontal";
  const disabled = () => local.disabled ?? false;
  // Solid has no separate React pre-hydration script path. Both edge modes use
  // the same responsive post-mount measurement and hydration-safe visibility.
  const alignment = () => local.thumbAlignment ?? "edge";
  const collisionBehavior = () => local.thumbCollisionBehavior ?? "push";
  const [uncontrolledValue, setUncontrolledValue] = createSignal<SliderValue>(
    local.defaultValue ?? min(),
  );
  const rawValue = () => local.value ?? uncontrolledValue();
  const isRange = () => Array.isArray(rawValue());
  const values = createMemo(() => {
    const currentValue = rawValue();
    if (Array.isArray(currentValue)) {
      return currentValue.map((value) => clamp(value, min(), max())).sort((a, b) => a - b);
    }
    return [clamp(currentValue as number, min(), max())];
  });
  const thumbCount = createMemo(() => {
    const authoredValue = local.value ?? local.defaultValue;
    if (Array.isArray(authoredValue)) return authoredValue.length;
    return authoredValue === undefined ? 2 : 1;
  });
  const [activeThumbIndex, setActiveThumbIndex] = createSignal(-1);
  const [lastUsedThumbIndex, setLastUsedThumbIndex] = createSignal(-1);
  const [dragging, setDragging] = createSignal(false);
  const [measurementVersion, setMeasurementVersion] = createSignal(0);
  const [resolvedLabelledBy, setResolvedLabelledBy] = createSignal<string>();
  let rootElement: HTMLElement | undefined;
  let controlElement: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let controlSize = 0;
  const thumbElements: Array<HTMLDivElement | undefined> = [];
  const inputElements: Array<HTMLInputElement | undefined> = [];
  const thumbSizes: number[] = [];
  let pressedThumbIndex = -1;
  let pressedPointerId: number | null = null;
  let pressedThumbCenterOffset = 0;
  let pressedValues: number[] | null = null;
  let latestInteractionValues: number[] | null = null;
  let currentInteractionValue: SliderValue | null = null;
  let lastChangeReason: SliderChangeReason = "none";

  const measure = () => {
    if (!controlElement) return;
    const vertical = orientation() === "vertical";
    const controlRect = controlElement.getBoundingClientRect();
    controlSize = vertical ? controlRect.height : controlRect.width;
    thumbElements.forEach((element, index) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      thumbSizes[index] = vertical ? rect.height : rect.width;
    });
    setMeasurementVersion((version) => version + 1);
  };

  const registerThumb = (element: HTMLDivElement, index: number) => {
    thumbElements[index] = element;
    resizeObserver?.observe(element);
    queueMicrotask(measure);
  };

  const positionPercent = (index: number) => {
    measurementVersion();
    const value = values()[index];
    if (value === undefined || max() === min()) return undefined;
    const percentage = clamp((value - min()) / (max() - min()), 0, 1);
    if (alignment() === "center") return percentage * 100;
    const thumbSize = thumbSizes[index] ?? 0;
    if (controlSize <= 0 || thumbSize <= 0) return undefined;
    return ((thumbSize / 2 + (controlSize - thumbSize) * percentage) / controlSize) * 100;
  };

  const thumbStyle = (index: number) => {
    const position = positionPercent(index);
    const vertical = orientation() === "vertical";
    const style: JSX.CSSProperties = {
      position: "absolute",
      visibility: position === undefined ? "hidden" : undefined,
      "z-index": activeThumbIndex() === index ? 2 : lastUsedThumbIndex() === index ? 1 : undefined,
    };
    const property = vertical ? "bottom" : "inset-inline-start";
    style[property] = `${position ?? 0}%`;
    style[vertical ? "left" : "top"] = "50%";
    style.translate = vertical ? "-50% 50%" : "-50% -50%";
    if (alignment() !== "center") style["--position"] = `${position ?? 0}%`;
    return style;
  };

  const indicatorStyle = () => {
    const vertical = orientation() === "vertical";
    const start = positionPercent(0);
    const range = values().length > 1;
    const end = range ? positionPercent(values().length - 1) : start;
    const startPosition = start ?? 0;
    const endPosition = end ?? 0;
    const startEdge = vertical ? "bottom" : "inset-inline-start";
    const mainSide = vertical ? "height" : "width";
    const style: JSX.CSSProperties = {
      position: vertical ? "absolute" : "relative",
      visibility: start === undefined || (range && end === undefined) ? "hidden" : undefined,
      [vertical ? "width" : "height"]: "inherit",
    };
    if (alignment() !== "center") {
      style["--start-position"] = `${startPosition}%`;
      if (range) {
        style["--relative-size"] = `${endPosition - startPosition}%`;
        style[startEdge] = "var(--start-position)";
        style[mainSide] = "var(--relative-size)";
      } else {
        style[startEdge] = 0;
        style[mainSide] = "var(--start-position)";
      }
      return style;
    }
    style[startEdge] = `${range ? startPosition : 0}%`;
    style[mainSide] = `${range ? endPosition - startPosition : endPosition}%`;
    return style;
  };

  const outputValue = (nextValues: number[]): SliderValue =>
    isRange() ? nextValues.slice() : (nextValues[0] ?? min());

  const setValue = (
    nextValues: number[],
    reason: SliderChangeReason,
    event: Event,
    index: number,
  ) => {
    const nextValue = outputValue(nextValues);
    if (
      Number.isNaN(typeof nextValue === "number" ? nextValue : nextValue[0]) ||
      areValuesEqual(nextValue, rawValue())
    ) {
      return false;
    }

    const details = createChangeDetails(reason, event, index, nextValue, local.name);
    local.onValueChange?.(nextValue, details);
    if (details.isCanceled) return false;

    lastChangeReason = reason;
    if (local.value === undefined) setUncontrolledValue(nextValue);
    return true;
  };

  const commitValue = (value: SliderValue, event: Event) => {
    local.onValueCommitted?.(value, { event, reason: lastChangeReason });
  };

  const focusThumb = (index: number) => {
    const input = inputElements[index];
    input?.focus({ preventScroll: true });
    setActiveThumbIndex(index);
    setLastUsedThumbIndex(index);
  };

  const resetPointerInteraction = () => {
    if (pressedPointerId !== null && controlElement?.hasPointerCapture?.(pressedPointerId)) {
      controlElement.releasePointerCapture(pressedPointerId);
    }
    pressedThumbIndex = -1;
    pressedPointerId = null;
    pressedThumbCenterOffset = 0;
    pressedValues = null;
    latestInteractionValues = null;
    currentInteractionValue = null;
    setDragging(false);
    setActiveThumbIndex(-1);
  };

  const getFingerValue = (event: PointerEvent): CollisionResult | null => {
    if (!controlElement || pressedThumbIndex < 0) return null;
    const rect = controlElement.getBoundingClientRect();
    const styles = getComputedStyle(controlElement);
    const vertical = orientation() === "vertical";
    const startBorder =
      Number.parseFloat(vertical ? styles.borderTopWidth : styles.borderInlineStartWidth) || 0;
    const endBorder =
      Number.parseFloat(vertical ? styles.borderBottomWidth : styles.borderInlineEndWidth) || 0;
    const startPadding =
      Number.parseFloat(vertical ? styles.paddingTop : styles.paddingInlineStart) || 0;
    const endPadding =
      Number.parseFloat(vertical ? styles.paddingBottom : styles.paddingInlineEnd) || 0;
    const edgeOffset = alignment() === "center" ? 0 : (thumbSizes[pressedThumbIndex] ?? 0) / 2;
    const size =
      (vertical ? rect.height : rect.width) -
      startBorder -
      endBorder -
      startPadding -
      endPadding -
      edgeOffset * 2;
    if (size <= 0) return null;

    const pointerPosition = vertical
      ? rect.bottom - event.clientY + pressedThumbCenterOffset
      : event.clientX - rect.left - pressedThumbCenterOffset;
    const pointer =
      pointerPosition -
      (vertical ? endBorder + endPadding : startBorder + startPadding) -
      edgeOffset;
    const percentage = clamp(pointer / size, 0, 1);
    const nextValue = clamp(
      roundValueToStep((max() - min()) * percentage + min(), step(), min()),
      min(),
      max(),
    );

    if (!isRange()) {
      return { didSwap: false, thumbIndex: 0, value: [nextValue] };
    }

    return resolveThumbCollision({
      behavior: collisionBehavior(),
      currentValues: latestInteractionValues ?? values(),
      initialValues: pressedValues,
      max: max(),
      min: min(),
      minStepsBetweenValues: minimumSteps(),
      nextValue,
      pressedIndex: pressedThumbIndex,
      step: step(),
      values: values(),
    });
  };

  const applyPointerValue = (
    result: CollisionResult,
    reason: "drag" | "track-press",
    event: PointerEvent,
  ) => {
    if (!validateMinimumDistance(result.value, step(), minimumSteps())) return false;
    const applied = setValue(result.value, reason, event, result.thumbIndex);
    if (!applied) return false;

    latestInteractionValues = result.value.slice();
    currentInteractionValue = outputValue(result.value);
    if (result.didSwap) {
      pressedThumbIndex = result.thumbIndex;
      focusThumb(result.thumbIndex);
    }
    return true;
  };

  const handlePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (disabled() || event.defaultPrevented || event.button !== 0 || !controlElement) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const thumb = target.closest<HTMLDivElement>('[data-slot="slider-thumb"]');
    const startedOnThumb = thumb !== null && controlElement.contains(thumb);
    pressedThumbIndex = startedOnThumb ? Number(thumb.dataset.index) : -1;
    pressedThumbCenterOffset = 0;
    pressedValues = values().slice();
    latestInteractionValues = values().slice();
    currentInteractionValue = null;

    if (startedOnThumb && thumb) {
      const rect = thumb.getBoundingClientRect();
      const midpoint =
        orientation() === "vertical" ? (rect.top + rect.bottom) / 2 : (rect.left + rect.right) / 2;
      pressedThumbCenterOffset =
        (orientation() === "vertical" ? event.clientY : event.clientX) - midpoint;
      if (values()[pressedThumbIndex] === max()) {
        while (pressedThumbIndex > 0 && values()[pressedThumbIndex - 1] === max()) {
          pressedThumbIndex -= 1;
        }
      }
    } else {
      const pointer = orientation() === "vertical" ? event.clientY : event.clientX;
      let closestDistance = Number.POSITIVE_INFINITY;
      thumbElements.forEach((element, index) => {
        if (!element || values()[index] === undefined) return;
        const rect = element.getBoundingClientRect();
        const midpoint =
          orientation() === "vertical"
            ? (rect.top + rect.bottom) / 2
            : (rect.left + rect.right) / 2;
        const distance = Math.abs(pointer - midpoint);
        if (distance <= closestDistance) {
          closestDistance = distance;
          pressedThumbIndex = index;
        }
      });
    }

    if (pressedThumbIndex < 0) return;
    pressedPointerId = event.pointerId;
    focusThumb(pressedThumbIndex);
    setDragging(true);
    if (!startedOnThumb) {
      const result = getFingerValue(event);
      if (result) applyPointerValue(result, "track-press", event);
    }
    controlElement.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (pressedThumbIndex < 0 || !controlElement?.hasPointerCapture?.(event.pointerId)) return;
    if (disabled()) {
      resetPointerInteraction();
      return;
    }
    if (event.buttons === 0) {
      handlePointerEnd(event);
      return;
    }
    const result = getFingerValue(event);
    if (result) applyPointerValue(result, "drag", event);
  };

  const handlePointerEnd = (event: PointerEvent) => {
    if (pressedThumbIndex < 0) return;
    if (currentInteractionValue !== null) commitValue(currentInteractionValue, event);
    resetPointerInteraction();
  };

  const getKeyboardValues = (index: number, nextValue: number) => {
    if (!isRange()) return [clamp(nextValue, min(), max())];
    const nextValues = values().slice();
    nextValues[index] = clamp(
      nextValue,
      nextValues[index - 1] ?? Number.NEGATIVE_INFINITY,
      nextValues[index + 1] ?? Number.POSITIVE_INFINITY,
    );
    return nextValues.sort((a, b) => a - b);
  };

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.defaultPrevented || disabled()) return;
    const currentValue = values()[index];
    if (currentValue === undefined) return;
    const roundedValue = roundValueToStep(currentValue, step(), min());
    let nextValue: number | null = null;

    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        nextValue = getNewValue(
          roundedValue,
          event.shiftKey ? largeStep() : step(),
          1,
          min(),
          max(),
        );
        break;
      case "ArrowDown":
      case "ArrowLeft":
        nextValue = getNewValue(
          roundedValue,
          event.shiftKey ? largeStep() : step(),
          -1,
          min(),
          max(),
        );
        break;
      case "PageUp":
        nextValue = getNewValue(roundedValue, largeStep(), 1, min(), max());
        break;
      case "PageDown":
        nextValue = getNewValue(roundedValue, largeStep(), -1, min(), max());
        break;
      case "End":
        nextValue =
          values()[index + 1] === undefined ? max() : values()[index + 1] - step() * minimumSteps();
        break;
      case "Home":
        nextValue =
          values()[index - 1] === undefined ? min() : values()[index - 1] + step() * minimumSteps();
        break;
      default:
        return;
    }

    const nextValues = getKeyboardValues(index, nextValue);
    if (
      validateMinimumDistance(nextValues, step(), minimumSteps()) &&
      setValue(nextValues, "keyboard", event, index)
    ) {
      commitValue(outputValue(nextValues), event);
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const handleInputChange = (event: Event, index: number) => {
    const target = event.currentTarget as HTMLInputElement;
    const nextValues = getKeyboardValues(index, target.valueAsNumber);
    if (
      validateMinimumDistance(nextValues, step(), minimumSteps()) &&
      setValue(nextValues, "input-change", event, index)
    ) {
      commitValue(outputValue(nextValues), event);
    }
    target.value = String(values()[index] ?? min());
  };

  const ariaValueText = (index: number) => {
    const value = values()[index];
    if (value === undefined) return undefined;
    const formatted = new Intl.NumberFormat(local.locale, local.format).format(value);
    if (values().length === 2) return `${formatted} ${index === 0 ? "start" : "end"} range`;
    return local.format ? formatted : undefined;
  };

  onMount(() => {
    const label = Array.from(document.getElementsByTagName("label")).find(
      (element) => element.htmlFor === id(),
    );
    if (label) {
      if (!label.id) label.id = `${id()}-label`;
      setResolvedLabelledBy(label.id);
    }

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(measure);
      if (controlElement) resizeObserver.observe(controlElement);
      thumbElements.forEach((element) => {
        if (element) resizeObserver?.observe(element);
      });
    }
    measure();
    queueMicrotask(measure);

    const form = local.form
      ? (document.getElementById(local.form) as HTMLFormElement | null)
      : rootElement?.closest("form");
    const reset = () => {
      if (local.value === undefined) setUncontrolledValue(local.defaultValue ?? min());
    };
    form?.addEventListener("reset", reset);
    onCleanup(() => form?.removeEventListener("reset", reset));
  });

  createEffect(() => {
    if (!disabled() || !rootElement) return;
    const activeElement = rootElement.ownerDocument.activeElement;
    if (activeElement instanceof HTMLElement && rootElement.contains(activeElement)) {
      activeElement.blur();
    }
    resetPointerInteraction();
  });

  onCleanup(() => {
    resetPointerInteraction();
    resizeObserver?.disconnect();
  });

  return (
    <Dynamic
      component={local.as ?? "div"}
      ref={(element: HTMLElement) => {
        rootElement = element;
        local.ref?.(element);
      }}
      id={id()}
      role="group"
      aria-label={local["aria-label"]}
      aria-labelledby={local["aria-labelledby"] ?? resolvedLabelledBy()}
      data-slot="slider"
      data-orientation={orientation()}
      data-disabled={disabled() ? "" : undefined}
      data-dragging={dragging() ? "" : undefined}
      class={cn(
        "data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full",
        local.class,
      )}
      {...others}
    >
      <div
        ref={(element) => {
          controlElement = element;
        }}
        data-orientation={orientation()}
        data-disabled={disabled() ? "" : undefined}
        data-dragging={dragging() ? "" : undefined}
        class="z-slider relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          data-slot="slider-track"
          data-orientation={orientation()}
          data-disabled={disabled() ? "" : undefined}
          data-dragging={dragging() ? "" : undefined}
          class="z-slider-track relative grow overflow-hidden select-none"
        >
          <div
            data-slot="slider-range"
            data-orientation={orientation()}
            data-disabled={disabled() ? "" : undefined}
            data-dragging={dragging() ? "" : undefined}
            class="z-slider-range select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
            style={indicatorStyle()}
          />
        </div>
        <Index each={Array.from({ length: thumbCount() })}>
          {(_, index) => {
            const value = () => values()[index];
            return (
              <div
                ref={(element) => registerThumb(element, index)}
                data-slot="slider-thumb"
                data-index={index}
                data-active={activeThumbIndex() === index ? "true" : undefined}
                data-orientation={orientation()}
                data-disabled={disabled() ? "" : undefined}
                data-dragging={dragging() ? "" : undefined}
                class="z-slider-thumb block shrink-0 select-none data-disabled:pointer-events-none data-disabled:opacity-50"
                style={thumbStyle(index)}
              >
                <input
                  ref={(element) => {
                    inputElements[index] = element;
                  }}
                  type="range"
                  id={`${id()}-input-${index}`}
                  name={local.name}
                  form={local.form}
                  min={min()}
                  max={max()}
                  step={step()}
                  value={value() ?? min()}
                  disabled={disabled() || value() === undefined}
                  aria-label={local["aria-label"]}
                  aria-labelledby={local["aria-labelledby"] ?? resolvedLabelledBy()}
                  aria-orientation={orientation()}
                  aria-valuetext={ariaValueText(index)}
                  style={{
                    ...visuallyHiddenStyles,
                    height: "100%",
                    width: "100%",
                    "writing-mode": orientation() === "vertical" ? "vertical-lr" : undefined,
                  }}
                  onFocus={() => {
                    setActiveThumbIndex(index);
                    setLastUsedThumbIndex(index);
                  }}
                  onBlur={() => setActiveThumbIndex(-1)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  onChange={(event) => handleInputChange(event, index)}
                />
              </div>
            );
          }}
        </Index>
      </div>
    </Dynamic>
  );
};

export { Slider };
