/**
 * `type` / `accept` tags used to keep column drags and item drags from
 * targeting each other. Columns accept both so a card can be dropped on the
 * empty area of a column; items only accept items.
 */
const COLUMN_TYPE = "kanban-column";
const ITEM_TYPE = "kanban-item";

/**
 * `CollisionPriority.Low`, inlined as a literal so this block depends on
 * `@dnd-kit/solid` alone and never reaches into `@dnd-kit/abstract`. A column
 * must lose to any card inside it, so that hovering a card targets the card and
 * only the bare column area targets the column.
 */
const COLUMN_COLLISION_PRIORITY = 1;

type DropAnimationConfig = {
  duration: number;
  easing: string;
};

const defaultDropAnimation: DropAnimationConfig = {
  duration: 250,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
};

export type { DropAnimationConfig };
export { COLUMN_COLLISION_PRIORITY, COLUMN_TYPE, defaultDropAnimation, ITEM_TYPE };
