import { isSortable } from "@dnd-kit/solid/sortable";

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Reorders the board so that `activeValue` sits where `overValue` currently is.
 * `overValue` may be an item id or a column id; dropping on a column id appends
 * to that column (and, within the source column, moves the card to the end).
 *
 * Returns `null` when the drop is a no-op or either end cannot be resolved.
 */
function moveItem<T>(
  columns: Record<string, T[]>,
  getItemValue: (item: T) => string,
  columnIds: string[],
  activeValue: string,
  overValue: string,
): Record<string, T[]> | null {
  const activeContainer = columnIds.find((key) =>
    columns[key].some((item) => getItemValue(item) === activeValue),
  );
  if (!activeContainer) return null;

  const overIsColumn = columnIds.includes(overValue);
  const overContainer = overIsColumn
    ? overValue
    : columnIds.find((key) => columns[key].some((item) => getItemValue(item) === overValue));
  if (!overContainer) return null;

  const activeItems = columns[activeContainer];
  const activeIndex = activeItems.findIndex((item) => getItemValue(item) === activeValue);
  if (activeIndex === -1) return null;

  if (activeContainer === overContainer) {
    const overIndex = overIsColumn
      ? activeItems.length - 1
      : activeItems.findIndex((item) => getItemValue(item) === overValue);
    if (overIndex === -1 || overIndex === activeIndex) return null;
    return { ...columns, [activeContainer]: arrayMove(activeItems, activeIndex, overIndex) };
  }

  const overItems = columns[overContainer];
  const rawOverIndex = overIsColumn
    ? overItems.length
    : overItems.findIndex((item) => getItemValue(item) === overValue);
  const overIndex = rawOverIndex === -1 ? overItems.length : rawOverIndex;

  const nextActive = activeItems.slice();
  const [moved] = nextActive.splice(activeIndex, 1);
  const nextOver = overItems.slice();
  nextOver.splice(overIndex, 0, moved);

  return { ...columns, [activeContainer]: nextActive, [overContainer]: nextOver };
}

type SortableDrop = {
  /** Group the drag started in. `undefined` for columns, which have no group. */
  fromGroup: string | undefined;
  fromIndex: number;
  /** Group the drag landed in. */
  toGroup: string | undefined;
  toIndex: number;
};

/**
 * Resolves where a drag actually landed, from the drag source itself.
 *
 * `event.operation.target` cannot answer this at drop time. dnd-kit's
 * `OptimisticSortingPlugin` re-parents the dragged element as the pointer
 * moves, so on release the droppable under the pointer is normally the dragged
 * element in its own new slot — making `target.id` equal `source.id` and any
 * position derived from it equal to where the drag started.
 *
 * A sortable source tracks this itself: `index`/`group` are the live optimistic
 * position, `initialIndex`/`initialGroup` the position at drag start. Returns
 * `null` for a non-sortable source, so callers can fall back to target ids.
 */
function resolveSortableDrop(source: unknown): SortableDrop | null {
  if (!isSortable(source as Parameters<typeof isSortable>[0])) return null;

  const sortable = source as {
    index: number;
    initialIndex: number;
    group?: string | number;
    initialGroup?: string | number;
  };

  return {
    fromGroup: sortable.initialGroup === undefined ? undefined : String(sortable.initialGroup),
    fromIndex: sortable.initialIndex,
    toGroup: sortable.group === undefined ? undefined : String(sortable.group),
    toIndex: sortable.index,
  };
}

/** Reorders the column keys, preserving each column's items. */
function moveColumn<T>(
  columns: Record<string, T[]>,
  activeIndex: number,
  overIndex: number,
): Record<string, T[]> {
  const order = arrayMove(Object.keys(columns), activeIndex, overIndex);
  const next: Record<string, T[]> = {};
  for (const key of order) next[key] = columns[key];
  return next;
}

export { moveColumn, moveItem, resolveSortableDrop };
