import { format, isEqual } from "date-fns";
import { Ellipsis } from "lucide-solid";
import { createEffect, createMemo, createSignal, For, on, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { match } from "ts-pattern";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import { Calendar } from "@/registry/kobalte/ui/calendar";
import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/registry/kobalte/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/kobalte/ui/popover";
import { Slider } from "@/registry/kobalte/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";
import { numberFilterOperators } from "../core/operators";
import type {
  Column,
  ColumnDataType,
  ColumnOptionExtended,
  DataTableFilterActions,
  FilterModel,
  FilterStrategy,
} from "../core/types";
import { useDebounceCallback } from "../hooks/use-debounce-callback";
import { take } from "../lib/array";
import { createNumberRange } from "../lib/helpers";
import { type Locale, t } from "../lib/i18n";
import { DebouncedInput } from "../ui/debounced-input";

interface FilterValueProps<TData, TType extends ColumnDataType> {
  filter: FilterModel<TType>;
  column: Column<TData, TType>;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

export function FilterValue<TData, TType extends ColumnDataType>(
  props: FilterValueProps<TData, TType>,
) {
  return (
    <Popover>
      <PopoverAnchor class="h-full" />
      <PopoverTrigger
        as={Button}
        variant="ghost"
        class="m-0 h-full w-fit whitespace-nowrap rounded-none p-0 px-2 text-xs"
      >
        <FilterValueDisplay
          filter={props.filter}
          column={props.column}
          actions={props.actions}
          locale={props.locale}
        />
      </PopoverTrigger>
      <PopoverContent class="w-fit origin-(--kb-popper-content-transform-origin) p-0">
        <FilterValueController
          filter={props.filter}
          column={props.column}
          actions={props.actions}
          strategy={props.strategy}
          locale={props.locale}
        />
      </PopoverContent>
    </Popover>
  );
}

interface FilterValueDisplayProps<TData, TType extends ColumnDataType> {
  filter: FilterModel<TType>;
  column: Column<TData, TType>;
  actions: DataTableFilterActions;
  locale?: Locale;
}

export function FilterValueDisplay<TData, TType extends ColumnDataType>(
  props: FilterValueDisplayProps<TData, TType>,
) {
  return match(props.column.type as ColumnDataType)
    .with("option", () => (
      <FilterValueOptionDisplay
        filter={props.filter as FilterModel<"option">}
        column={props.column as Column<TData, "option">}
        actions={props.actions}
        locale={props.locale}
      />
    ))
    .with("multiOption", () => (
      <FilterValueMultiOptionDisplay
        filter={props.filter as FilterModel<"multiOption">}
        column={props.column as Column<TData, "multiOption">}
        actions={props.actions}
        locale={props.locale}
      />
    ))
    .with("date", () => (
      <FilterValueDateDisplay
        filter={props.filter as FilterModel<"date">}
        column={props.column as Column<TData, "date">}
        actions={props.actions}
        locale={props.locale}
      />
    ))
    .with("text", () => (
      <FilterValueTextDisplay
        filter={props.filter as FilterModel<"text">}
        column={props.column as Column<TData, "text">}
        actions={props.actions}
        locale={props.locale}
      />
    ))
    .with("number", () => (
      <FilterValueNumberDisplay
        filter={props.filter as FilterModel<"number">}
        column={props.column as Column<TData, "number">}
        actions={props.actions}
        locale={props.locale}
      />
    ))
    .exhaustive();
}

export function FilterValueOptionDisplay<TData>(props: FilterValueDisplayProps<TData, "option">) {
  const options = createMemo(() => props.column.getOptions());
  const selected = createMemo(() =>
    options().filter((o) => props.filter?.values.includes(o.value)),
  );

  return (
    <Show
      when={selected().length === 1 && selected()[0]}
      fallback={
        <MultiOptionIconsDisplay column={props.column} selected={selected()} options={options()} />
      }
    >
      {(item) => (
        <span class="inline-flex items-center gap-1">
          <Show when={item().icon}>
            {(icon) => (
              <Show when={typeof icon() === "function"} fallback={icon() as any}>
                <Dynamic component={icon() as any} class="size-4 text-primary" />
              </Show>
            )}
          </Show>
          <span>{item().label}</span>
        </span>
      )}
    </Show>
  );
}

function MultiOptionIconsDisplay<TData>(props: {
  column: Column<TData, any>;
  selected: ColumnOptionExtended[];
  options: ColumnOptionExtended[];
}) {
  const name = () => props.column.displayName.toLowerCase();
  const pluralName = () => (name().endsWith("s") ? `${name()}es` : `${name()}s`);
  const hasOptionIcons = () => !props.options?.some((o) => !o.icon);

  return (
    <div class="inline-flex items-center gap-0.5">
      <Show when={hasOptionIcons()}>
        <For each={take(props.selected, 3)}>
          {(item) => (
            <Show when={typeof item.icon === "function"} fallback={item.icon as any}>
              <Dynamic component={item.icon as any} class="size-4" />
            </Show>
          )}
        </For>
      </Show>
      <span class={cn(hasOptionIcons() && "ml-1.5")}>
        {props.selected.length} {pluralName()}
      </span>
    </div>
  );
}

export function FilterValueMultiOptionDisplay<TData>(
  props: FilterValueDisplayProps<TData, "multiOption">,
) {
  const options = createMemo(() => props.column.getOptions());
  const selected = createMemo(() => options().filter((o) => props.filter.values.includes(o.value)));

  return (
    <Show
      when={selected().length === 1 && selected()[0]}
      fallback={
        <MultiOptionIconsDisplay column={props.column} selected={selected()} options={options()} />
      }
    >
      {(item) => (
        <span class="inline-flex items-center gap-1.5">
          <Show when={item().icon}>
            {(icon) => (
              <Show when={typeof icon() === "function"} fallback={icon() as any}>
                <Dynamic component={icon() as any} class="size-4 text-primary" />
              </Show>
            )}
          </Show>
          <span>{item().label}</span>
        </span>
      )}
    </Show>
  );
}

function formatDateRange(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth && sameYear) {
    return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
  }

  if (sameYear) {
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  }

  return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
}

export function FilterValueDateDisplay<TData>(props: FilterValueDisplayProps<TData, "date">) {
  return (
    <Show when={props.filter} fallback={null}>
      <Show when={props.filter.values.length > 0} fallback={<Ellipsis class="size-4" />}>
        <Show
          when={props.filter.values.length === 1}
          fallback={<span>{formatDateRange(props.filter.values[0], props.filter.values[1])}</span>}
        >
          <span>{format(props.filter.values[0], "MMM d, yyyy")}</span>
        </Show>
      </Show>
    </Show>
  );
}

export function FilterValueTextDisplay<TData>(props: FilterValueDisplayProps<TData, "text">) {
  return (
    <Show when={props.filter} fallback={null}>
      <Show
        when={props.filter.values.length > 0 && props.filter.values[0].trim() !== ""}
        fallback={<Ellipsis class="size-4" />}
      >
        <span>{props.filter.values[0]}</span>
      </Show>
    </Show>
  );
}

export function FilterValueNumberDisplay<TData>(props: FilterValueDisplayProps<TData, "number">) {
  return (
    <Show when={props.filter?.values && props.filter.values.length > 0} fallback={null}>
      <Show
        when={props.filter.operator === "is between" || props.filter.operator === "is not between"}
        fallback={<span class="tabular-nums tracking-tight">{props.filter.values[0]}</span>}
      >
        <span class="tabular-nums tracking-tight">
          {props.filter.values[0]} {t("and", props.locale ?? "en")} {props.filter.values[1]}
        </span>
      </Show>
    </Show>
  );
}

/****** Property Filter Value Controller ******/

interface FilterValueControllerProps<TData, TType extends ColumnDataType> {
  filter: FilterModel<TType>;
  column: Column<TData, TType>;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
}

export function FilterValueController<TData, TType extends ColumnDataType>(
  props: FilterValueControllerProps<TData, TType>,
) {
  return match(props.column.type as ColumnDataType)
    .with("option", () => (
      <FilterValueOptionController
        filter={props.filter as FilterModel<"option">}
        column={props.column as Column<TData, "option">}
        actions={props.actions}
        strategy={props.strategy}
        locale={props.locale}
      />
    ))
    .with("multiOption", () => (
      <FilterValueMultiOptionController
        filter={props.filter as FilterModel<"multiOption">}
        column={props.column as Column<TData, "multiOption">}
        actions={props.actions}
        strategy={props.strategy}
        locale={props.locale}
      />
    ))
    .with("date", () => (
      <FilterValueDateController
        filter={props.filter as FilterModel<"date">}
        column={props.column as Column<TData, "date">}
        actions={props.actions}
        strategy={props.strategy}
        locale={props.locale}
      />
    ))
    .with("text", () => (
      <FilterValueTextController
        filter={props.filter as FilterModel<"text">}
        column={props.column as Column<TData, "text">}
        actions={props.actions}
        strategy={props.strategy}
        locale={props.locale}
      />
    ))
    .with("number", () => (
      <FilterValueNumberController
        filter={props.filter as FilterModel<"number">}
        column={props.column as Column<TData, "number">}
        actions={props.actions}
        strategy={props.strategy}
        locale={props.locale}
      />
    ))
    .exhaustive();
}

interface OptionItemProps {
  option: ColumnOptionExtended & { initialSelected: boolean };
  onToggle: (value: string, checked: boolean) => void;
}

function OptionItem(props: OptionItemProps) {
  const handleSelect = () => {
    props.onToggle(props.option.value, !props.option.selected);
  };

  return (
    <CommandItem onSelect={handleSelect} class="group flex items-center justify-between gap-1.5">
      <div class="flex items-center gap-1.5">
        <Checkbox
          checked={props.option.selected}
          class="mr-1 opacity-0 data-checked:opacity-100 group-data-[selected=true]:opacity-100 dark:border-ring"
        />
        <Show when={props.option.icon}>
          {(icon) => (
            <Show when={typeof icon() === "function"} fallback={icon() as any}>
              <Dynamic component={icon() as any} class="size-4 text-primary" />
            </Show>
          )}
        </Show>
        <span>
          {props.option.label}
          <sup
            class={cn(
              props.option.count == null && "hidden",
              "ml-0.5 text-muted-foreground tabular-nums tracking-tight",
              props.option.count === 0 && "slashed-zero",
            )}
          >
            {typeof props.option.count === "number"
              ? props.option.count < 100
                ? props.option.count
                : "100+"
              : ""}
          </sup>
        </span>
      </div>
    </CommandItem>
  );
}

export function FilterValueOptionController<TData>(
  props: FilterValueControllerProps<TData, "option">,
) {
  const initialOptions = createMemo(() => {
    const counts = props.column.getFacetedUniqueValues();
    return props.column.getOptions().map((o) => ({
      ...o,
      selected: props.filter?.values.includes(o.value),
      initialSelected: props.filter?.values.includes(o.value),
      count: counts?.get(o.value) ?? 0,
    }));
  });

  const [options, setOptions] = createSignal(initialOptions());

  createEffect(
    on(
      () => props.filter?.values,
      () => {
        setOptions((prev) =>
          prev.map((o) => ({
            ...o,
            selected: props.filter?.values.includes(o.value),
          })),
        );
      },
    ),
  );

  const handleToggle = (value: string, checked: boolean) => {
    if (checked) props.actions.addFilterValue(props.column, [value]);
    else props.actions.removeFilterValue(props.column, [value]);
  };

  const selectedOptions = createMemo(() => options().filter((o) => o.initialSelected));
  const unselectedOptions = createMemo(() => options().filter((o) => !o.initialSelected));

  return (
    <>
      {/* @ts-expect-error cmdk-solid loop prop not in ComponentProps<"div"> */}
      <Command loop>
        <CommandInput autofocus placeholder={t("search", props.locale ?? "en")} />
        <CommandEmpty>{t("noresults", props.locale ?? "en")}</CommandEmpty>
        <CommandList class="max-h-fit">
          <CommandGroup class={cn(selectedOptions().length === 0 && "hidden")}>
            <For each={selectedOptions()}>
              {(option) => <OptionItem option={option} onToggle={handleToggle} />}
            </For>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup class={cn(unselectedOptions().length === 0 && "hidden")}>
            <For each={unselectedOptions()}>
              {(option) => <OptionItem option={option} onToggle={handleToggle} />}
            </For>
          </CommandGroup>
        </CommandList>
      </Command>
    </>
  );
}

export function FilterValueMultiOptionController<TData>(
  props: FilterValueControllerProps<TData, "multiOption">,
) {
  const initialOptions = createMemo(() => {
    const counts = props.column.getFacetedUniqueValues();
    return props.column.getOptions().map((o) => {
      const selected = props.filter?.values.includes(o.value);
      return {
        ...o,
        selected,
        initialSelected: selected,
        count: counts?.get(o.value) ?? 0,
      };
    });
  });

  const [options, setOptions] = createSignal(initialOptions());

  createEffect(
    on(
      () => props.filter?.values,
      () => {
        setOptions((prev) =>
          prev.map((o) => ({
            ...o,
            selected: props.filter?.values.includes(o.value),
          })),
        );
      },
    ),
  );

  const handleToggle = (value: string, checked: boolean) => {
    if (checked) props.actions.addFilterValue(props.column, [value]);
    else props.actions.removeFilterValue(props.column, [value]);
  };

  const selectedOptions = createMemo(() => options().filter((o) => o.initialSelected));
  const unselectedOptions = createMemo(() => options().filter((o) => !o.initialSelected));

  return (
    <>
      {/* @ts-expect-error cmdk-solid loop prop not in ComponentProps<"div"> */}
      <Command loop>
        <CommandInput autofocus placeholder={t("search", props.locale ?? "en")} />
        <CommandEmpty>{t("noresults", props.locale ?? "en")}</CommandEmpty>
        <CommandList>
          <CommandGroup class={cn(selectedOptions().length === 0 && "hidden")}>
            <For each={selectedOptions()}>
              {(option) => <OptionItem option={option} onToggle={handleToggle} />}
            </For>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup class={cn(unselectedOptions().length === 0 && "hidden")}>
            <For each={unselectedOptions()}>
              {(option) => <OptionItem option={option} onToggle={handleToggle} />}
            </For>
          </CommandGroup>
        </CommandList>
      </Command>
    </>
  );
}

export function FilterValueDateController<TData>(props: FilterValueControllerProps<TData, "date">) {
  const [date, setDate] = createSignal<{
    from: Date | null;
    to: Date | null;
  }>({
    from: props.filter?.values[0] ?? new Date(),
    to: props.filter?.values[1] ?? null,
  });

  function changeDateRange(value: { from: Date | null; to: Date | null }) {
    const start = value?.from;
    const end = start && value && value.to && !isEqual(start, value.to) ? value.to : undefined;

    setDate({ from: start, to: end ?? null });

    const isRange = start && end;
    const newValues = isRange ? [start, end] : start ? [start] : [];

    props.actions.setFilterValue(props.column, newValues);
  }

  return (
    <Command>
      <CommandList class="max-h-fit">
        <CommandGroup>
          <div>
            <Calendar
              mode="range"
              defaultMonth={date()?.from ?? undefined}
              value={date()}
              onValueChange={changeDateRange}
              numberOfMonths={1}
            />
          </div>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function FilterValueTextController<TData>(props: FilterValueControllerProps<TData, "text">) {
  const changeText = (value: string | number) => {
    props.actions.setFilterValue(props.column, [String(value)]);
  };

  return (
    <Command>
      <CommandList class="max-h-fit">
        <CommandGroup>
          <CommandItem>
            <DebouncedInput
              placeholder={t("search", props.locale ?? "en")}
              autoFocus
              value={props.filter?.values[0] ?? ""}
              onChange={changeText}
            />
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function FilterValueNumberController<TData>(
  props: FilterValueControllerProps<TData, "number">,
) {
  const minMax = createMemo(() => props.column.getFacetedMinMaxValues());
  const sliderMin = () => (minMax() ? minMax()?.[0] : 0);
  const sliderMax = () => (minMax() ? minMax()?.[1] : 0);

  const [values, setValues] = createSignal(props.filter?.values ?? [0, 0]);

  createEffect(
    on(
      () => props.filter?.values,
      (filterValues) => {
        if (!filterValues) return;
        const current = values();
        const isSame =
          filterValues.length === current.length && filterValues.every((v, i) => v === current[i]);
        if (!isSame) {
          setValues(filterValues);
        }
      },
    ),
  );

  const isNumberRange = () =>
    props.filter && numberFilterOperators[props.filter.operator].target === "multiple";

  const setFilterOperatorDebounced = useDebounceCallback(props.actions.setFilterOperator, 500);
  const setFilterValueDebounced = useDebounceCallback(props.actions.setFilterValue, 500);

  const changeNumber = (value: number[]) => {
    setValues(value);
    setFilterValueDebounced(props.column as any, value);
  };

  const changeMinNumber = (value: number) => {
    const newValues = createNumberRange([value, values()[1]]);
    setValues(newValues);
    setFilterValueDebounced(props.column as any, newValues);
  };

  const changeMaxNumber = (value: number) => {
    const newValues = createNumberRange([values()[0], value]);
    setValues(newValues);
    setFilterValueDebounced(props.column as any, newValues);
  };

  const changeType = (type: "single" | "range") => {
    let newValues: number[] = [];
    if (type === "single") newValues = [values()[0]];
    else if (!minMax()) newValues = createNumberRange([values()[0], values()[1] ?? 0]);
    else {
      const value = values()[0];
      const mm = minMax()!;
      newValues =
        value - mm[0] < mm[1] - value
          ? createNumberRange([value, mm[1]])
          : createNumberRange([mm[0], value]);
    }

    const newOperator = type === "single" ? "is" : "is between";

    setValues(newValues);

    setFilterOperatorDebounced.cancel();
    setFilterValueDebounced.cancel();

    props.actions.setFilterOperator(props.column.id, newOperator);
    props.actions.setFilterValue(props.column, newValues);
  };

  return (
    <Command>
      <CommandList class="w-[300px] px-2 py-2">
        <CommandGroup>
          <div class="flex w-full flex-col">
            <Tabs
              value={isNumberRange() ? "range" : "single"}
              onChange={(v) => changeType(v as "single" | "range")}
            >
              <TabsList class="w-full *:text-xs">
                <TabsTrigger value="single">{t("single", props.locale ?? "en")}</TabsTrigger>
                <TabsTrigger value="range">{t("range", props.locale ?? "en")}</TabsTrigger>
              </TabsList>
              <TabsContent value="single" class="mt-4 flex flex-col gap-4">
                <Show when={minMax()}>
                  <Slider
                    value={[values()[0]]}
                    onChange={(value) => changeNumber(value)}
                    minValue={sliderMin()}
                    maxValue={sliderMax()}
                    step={1}
                  />
                </Show>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-xs">{t("value", props.locale ?? "en")}</span>
                  <DebouncedInput
                    id="single"
                    type="number"
                    value={values()[0].toString()}
                    onChange={(v) => changeNumber([Number(v)])}
                  />
                </div>
              </TabsContent>
              <TabsContent value="range" class="mt-4 flex flex-col gap-4">
                <Show when={minMax()}>
                  <Slider
                    value={values()}
                    onChange={changeNumber}
                    minValue={sliderMin()}
                    maxValue={sliderMax()}
                    step={1}
                  />
                </Show>
                <div class="grid grid-cols-2 gap-4">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-xs">{t("min", props.locale ?? "en")}</span>
                    <DebouncedInput
                      type="number"
                      value={values()[0]}
                      onChange={(v) => changeMinNumber(Number(v))}
                    />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-xs">{t("max", props.locale ?? "en")}</span>
                    <DebouncedInput
                      type="number"
                      value={values()[1]}
                      onChange={(v) => changeMaxNumber(Number(v))}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
