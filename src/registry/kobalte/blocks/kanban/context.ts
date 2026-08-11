import { createContext } from "solid-js";

type KanbanHandleContextValue = {
  setHandleRef: (el: Element | undefined) => void;
  isDragging: () => boolean;
  disabled: () => boolean | undefined;
};

const emptyHandleContext: KanbanHandleContextValue = {
  setHandleRef: () => undefined,
  isDragging: () => false,
  disabled: () => false,
};

const KanbanColumnContext = createContext<KanbanHandleContextValue>(emptyHandleContext);
const KanbanItemContext = createContext<KanbanHandleContextValue>(emptyHandleContext);

const IsOverlayContext = createContext(false);

type KanbanItemLocation = {
  group: string;
  index: number;
};

type KanbanRootContextValue = {
  columns: () => Record<string, unknown[]>;
  columnIds: () => string[];
  activeId: () => string | null;
  isColumn: (id: string) => boolean;
  indexOfColumn: (id: string) => number;
  /** Resolves the column and position an item id currently sits at. */
  locate: (itemId: string) => KanbanItemLocation | undefined;
  /**
   * `@dnd-kit/solid` is browser-only. The root renders presentational markup
   * during SSR/hydration and flips `live` after mount to engage drag and drop.
   */
  live: () => boolean;
};

const KanbanContext = createContext<KanbanRootContextValue>({
  columns: () => ({}),
  columnIds: () => [],
  activeId: () => null,
  isColumn: () => false,
  indexOfColumn: () => -1,
  locate: () => undefined,
  live: () => true,
});

export type { KanbanItemLocation, KanbanRootContextValue };
export { IsOverlayContext, KanbanColumnContext, KanbanContext, KanbanItemContext };
