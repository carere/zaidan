import type { DragDropProviderProps } from "@dnd-kit/solid";

/**
 * `@dnd-kit/solid` does not re-export the drag event object types, so they are
 * derived from the provider props. These are the raw next-generation dnd-kit
 * events; unlike React dnd-kit v6 they carry `event.operation.source` /
 * `event.operation.target` rather than `event.active` / `event.over`.
 */
export type KanbanDragStartEvent = Parameters<NonNullable<DragDropProviderProps["onDragStart"]>>[0];
export type KanbanDragOverEvent = Parameters<NonNullable<DragDropProviderProps["onDragOver"]>>[0];
export type KanbanDragEndEvent = Parameters<NonNullable<DragDropProviderProps["onDragEnd"]>>[0];

export type KanbanMoveEvent = {
  event: KanbanDragEndEvent;
  /** Identifier of the dragged item, as returned by `getItemValue`. */
  activeValue: string;
  activeContainer: string;
  activeIndex: number;
  overContainer: string;
  overIndex: number;
};

export type KanbanCommitMeta<T> = {
  kind: "item" | "column";
  event: KanbanDragEndEvent;
  /** Identifier of the dragged item, or of the dragged column when `kind` is `"column"`. */
  activeValue: string;
  activeContainer: string;
  activeIndex: number;
  overContainer: string;
  overIndex: number;
  previousValue: Record<string, T[]>;
};
