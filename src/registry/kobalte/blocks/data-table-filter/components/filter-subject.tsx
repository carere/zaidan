import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Column, ColumnDataType } from "../core/types";

interface FilterSubjectProps<TData, TType extends ColumnDataType> {
  column: Column<TData, TType>;
}

export function FilterSubject<TData, TType extends ColumnDataType>(
  props: FilterSubjectProps<TData, TType>,
) {
  const hasIcon = () => !!props.column.icon;
  return (
    <span class="flex select-none items-center gap-1 whitespace-nowrap px-2 font-medium">
      <Show when={hasIcon()}>
        <Dynamic component={props.column.icon} class="size-4 stroke-[2.25px]" />
      </Show>
      <span>{props.column.displayName}</span>
    </span>
  );
}
