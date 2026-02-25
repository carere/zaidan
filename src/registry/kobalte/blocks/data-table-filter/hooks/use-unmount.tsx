import { onCleanup } from "solid-js";

export function useUnmount(func: () => void) {
  onCleanup(() => {
    func();
  });
}
