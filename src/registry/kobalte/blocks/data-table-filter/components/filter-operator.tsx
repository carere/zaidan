import { createSignal, For } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/kobalte/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";
import {
  dateFilterOperators,
  filterTypeOperatorDetails,
  multiOptionFilterOperators,
  numberFilterOperators,
  optionFilterOperators,
  textFilterOperators,
} from "../core/operators";
import type {
  Column,
  ColumnDataType,
  DataTableFilterActions,
  FilterModel,
  FilterOperators,
} from "../core/types";
import { type Locale, t } from "../lib/i18n";

interface FilterOperatorProps<TData, TType extends ColumnDataType> {
  column: Column<TData, TType>;
  filter: FilterModel<TType>;
  actions: DataTableFilterActions;
  locale?: Locale;
}

export function FilterOperator<TData, TType extends ColumnDataType>(
  props: FilterOperatorProps<TData, TType>,
) {
  const [open, setOpen] = createSignal(false);
  const locale = () => props.locale ?? "en";

  const close = () => setOpen(false);

  return (
    <Popover open={open()} onOpenChange={setOpen}>
      <PopoverTrigger
        as={Button}
        variant="ghost"
        class="m-0 h-full w-fit whitespace-nowrap rounded-none p-0 px-2 text-xs"
      >
        <FilterOperatorDisplay
          filter={props.filter}
          columnType={props.column.type}
          locale={locale()}
        />
      </PopoverTrigger>
      <PopoverContent class="w-fit origin-(--kb-popover-content-transform-origin) p-0">
        <Command loop>
          <CommandInput placeholder={t("search", locale())} />
          <CommandEmpty>{t("noresults", locale())}</CommandEmpty>
          <CommandList class="max-h-fit">
            <FilterOperatorController
              filter={props.filter}
              column={props.column}
              actions={props.actions}
              closeController={close}
              locale={locale()}
            />
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface FilterOperatorDisplayProps<TType extends ColumnDataType> {
  filter: FilterModel<TType>;
  columnType: TType;
  locale?: Locale;
}

export function FilterOperatorDisplay<TType extends ColumnDataType>(
  props: FilterOperatorDisplayProps<TType>,
) {
  const locale = () => props.locale ?? "en";
  const operator = () => filterTypeOperatorDetails[props.columnType][props.filter.operator];
  const label = () => t(operator().key, locale());

  return <span class="text-muted-foreground">{label()}</span>;
}

interface FilterOperatorControllerProps<TData, TType extends ColumnDataType> {
  filter: FilterModel<TType>;
  column: Column<TData, TType>;
  actions: DataTableFilterActions;
  closeController: () => void;
  locale?: Locale;
}

export function FilterOperatorController<TData, TType extends ColumnDataType>(
  props: FilterOperatorControllerProps<TData, TType>,
) {
  const locale = () => props.locale ?? "en";

  switch (props.column.type) {
    case "option":
      return (
        <FilterOperatorOptionController
          filter={props.filter as FilterModel<"option">}
          column={props.column as Column<TData, "option">}
          actions={props.actions}
          closeController={props.closeController}
          locale={locale()}
        />
      );
    case "multiOption":
      return (
        <FilterOperatorMultiOptionController
          filter={props.filter as FilterModel<"multiOption">}
          column={props.column as Column<TData, "multiOption">}
          actions={props.actions}
          closeController={props.closeController}
          locale={locale()}
        />
      );
    case "date":
      return (
        <FilterOperatorDateController
          filter={props.filter as FilterModel<"date">}
          column={props.column as Column<TData, "date">}
          actions={props.actions}
          closeController={props.closeController}
          locale={locale()}
        />
      );
    case "text":
      return (
        <FilterOperatorTextController
          filter={props.filter as FilterModel<"text">}
          column={props.column as Column<TData, "text">}
          actions={props.actions}
          closeController={props.closeController}
          locale={locale()}
        />
      );
    case "number":
      return (
        <FilterOperatorNumberController
          filter={props.filter as FilterModel<"number">}
          column={props.column as Column<TData, "number">}
          actions={props.actions}
          closeController={props.closeController}
          locale={locale()}
        />
      );
    default:
      return null;
  }
}

function FilterOperatorOptionController<TData>(
  props: FilterOperatorControllerProps<TData, "option">,
) {
  const locale = () => props.locale ?? "en";
  const filterDetails = () => optionFilterOperators[props.filter.operator];
  const relatedFilters = () =>
    Object.values(optionFilterOperators).filter((o) => o.target === filterDetails().target);

  const changeOperator = (value: string) => {
    props.actions?.setFilterOperator(props.column.id, value as FilterOperators["option"]);
    props.closeController();
  };

  return (
    <CommandGroup heading={t("operators", locale())}>
      <For each={relatedFilters()}>
        {(r) => (
          <CommandItem onSelect={() => changeOperator(r.value)} value={r.value}>
            {t(r.key, locale())}
          </CommandItem>
        )}
      </For>
    </CommandGroup>
  );
}

function FilterOperatorMultiOptionController<TData>(
  props: FilterOperatorControllerProps<TData, "multiOption">,
) {
  const locale = () => props.locale ?? "en";
  const filterDetails = () => multiOptionFilterOperators[props.filter.operator];
  const relatedFilters = () =>
    Object.values(multiOptionFilterOperators).filter((o) => o.target === filterDetails().target);

  const changeOperator = (value: string) => {
    props.actions?.setFilterOperator(props.column.id, value as FilterOperators["multiOption"]);
    props.closeController();
  };

  return (
    <CommandGroup heading={t("operators", locale())}>
      <For each={relatedFilters()}>
        {(r) => (
          <CommandItem onSelect={() => changeOperator(r.value)} value={r.value}>
            {t(r.key, locale())}
          </CommandItem>
        )}
      </For>
    </CommandGroup>
  );
}

function FilterOperatorDateController<TData>(props: FilterOperatorControllerProps<TData, "date">) {
  const locale = () => props.locale ?? "en";
  const filterDetails = () => dateFilterOperators[props.filter.operator];
  const relatedFilters = () =>
    Object.values(dateFilterOperators).filter((o) => o.target === filterDetails().target);

  const changeOperator = (value: string) => {
    props.actions?.setFilterOperator(props.column.id, value as FilterOperators["date"]);
    props.closeController();
  };

  return (
    <CommandGroup>
      <For each={relatedFilters()}>
        {(r) => (
          <CommandItem onSelect={() => changeOperator(r.value)} value={r.value}>
            {t(r.key, locale())}
          </CommandItem>
        )}
      </For>
    </CommandGroup>
  );
}

export function FilterOperatorTextController<TData>(
  props: FilterOperatorControllerProps<TData, "text">,
) {
  const locale = () => props.locale ?? "en";
  const filterDetails = () => textFilterOperators[props.filter.operator];
  const relatedFilters = () =>
    Object.values(textFilterOperators).filter((o) => o.target === filterDetails().target);

  const changeOperator = (value: string) => {
    props.actions?.setFilterOperator(props.column.id, value as FilterOperators["text"]);
    props.closeController();
  };

  return (
    <CommandGroup heading={t("operators", locale())}>
      <For each={relatedFilters()}>
        {(r) => (
          <CommandItem onSelect={() => changeOperator(r.value)} value={r.value}>
            {t(r.key, locale())}
          </CommandItem>
        )}
      </For>
    </CommandGroup>
  );
}

function FilterOperatorNumberController<TData>(
  props: FilterOperatorControllerProps<TData, "number">,
) {
  const locale = () => props.locale ?? "en";
  const filterDetails = () => numberFilterOperators[props.filter.operator];
  const relatedFilters = () =>
    Object.values(numberFilterOperators).filter((o) => o.target === filterDetails().target);

  const changeOperator = (value: string) => {
    props.actions?.setFilterOperator(props.column.id, value as FilterOperators["number"]);
    props.closeController();
  };

  return (
    <div>
      <CommandGroup heading={t("operators", locale())}>
        <For each={relatedFilters()}>
          {(r) => (
            <CommandItem onSelect={() => changeOperator(r.value)} value={r.value}>
              {t(r.key, locale())}
            </CommandItem>
          )}
        </For>
      </CommandGroup>
    </div>
  );
}
