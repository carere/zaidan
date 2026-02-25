import { onCleanup } from "solid-js";
import { debounce } from "../lib/debounce";

type DebounceOptions = {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
};

type ControlFunctions = {
  cancel: () => void;
  flush: () => void;
  isPending: () => boolean;
};

export type DebouncedState<T extends (...args: any) => ReturnType<T>> = ((
  ...args: Parameters<T>
) => ReturnType<T> | undefined) &
  ControlFunctions;

export function useDebounceCallback<T extends (...args: any) => ReturnType<T>>(
  func: T,
  delay = 500,
  options?: DebounceOptions,
): DebouncedState<T> {
  const debouncedFuncInstance = debounce(func, delay, options);

  const wrappedFunc: DebouncedState<T> = (...args: Parameters<T>) => {
    return debouncedFuncInstance(...args);
  };

  wrappedFunc.cancel = () => {
    debouncedFuncInstance.cancel();
  };

  wrappedFunc.isPending = () => {
    return debouncedFuncInstance.isPending();
  };

  wrappedFunc.flush = () => {
    return debouncedFuncInstance.flush();
  };

  onCleanup(() => {
    debouncedFuncInstance.cancel();
  });

  return wrappedFunc;
}
