import { createContext } from "solid-js";

type SortableItemContextValue = {
  setHandleRef: (el: Element | undefined) => void;
  isDragging: () => boolean;
  disabled: () => boolean | undefined;
};

const SortableItemContext = createContext<SortableItemContextValue>({
  setHandleRef: () => undefined,
  isDragging: () => false,
  disabled: () => false,
});

const IsOverlayContext = createContext(false);

type SortableInternalContextValue = {
  activeId: () => string | null;
  // Returns the index of `id` in the current sortable list, or -1 if missing.
  indexOf: (id: string) => number;
  // `@dnd-kit/solid` is browser-only. The root renders presentational markup
  // during SSR/hydration and flips `live` after mount to engage drag and drop.
  live: () => boolean;
};

const SortableInternalContext = createContext<SortableInternalContextValue>({
  activeId: () => null,
  indexOf: () => -1,
  live: () => true,
});

export type { SortableInternalContextValue, SortableItemContextValue };
export { IsOverlayContext, SortableInternalContext, SortableItemContext };
