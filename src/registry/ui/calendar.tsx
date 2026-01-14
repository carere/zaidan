import Calendar from "@corvu/calendar";
import { ChevronLeft, ChevronRight } from "lucide-solid";
import { type ComponentProps, Index, mergeProps, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/registry/ui/button";

type CalendarSingleValue = Date | null;
type CalendarMultipleValue = Date[];
type CalendarRangeValue = { from: Date | null; to: Date | null };

type CalendarBaseProps = Omit<ComponentProps<"div">, "onChange"> & {
  /**
   * Whether to show days from the previous/next months
   * @default true
   */
  showOutsideDays?: boolean;
  /**
   * Whether to always show 6 weeks in the calendar
   * @default false
   */
  fixedWeeks?: boolean;
  /**
   * Number of months to display
   * @default 1
   */
  numberOfMonths?: number;
  /**
   * Function to disable specific dates
   */
  disabled?: (date: Date) => boolean;
  /**
   * The controlled month to display
   */
  month?: Date;
  /**
   * Callback when the displayed month changes
   */
  onMonthChange?: (month: Date) => void;
  /**
   * The initial month to display (uncontrolled)
   */
  defaultMonth?: Date;
  /**
   * Which day of the week to start on (0 = Sunday, 1 = Monday, etc.)
   * @default 1
   */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

type CalendarSingleProps = CalendarBaseProps & {
  mode?: "single";
  value?: CalendarSingleValue;
  onValueChange?: (value: CalendarSingleValue) => void;
  defaultValue?: CalendarSingleValue;
};

type CalendarMultipleProps = CalendarBaseProps & {
  mode: "multiple";
  value?: CalendarMultipleValue;
  onValueChange?: (value: CalendarMultipleValue) => void;
  defaultValue?: CalendarMultipleValue;
};

type CalendarRangeProps = CalendarBaseProps & {
  mode: "range";
  value?: CalendarRangeValue;
  onValueChange?: (value: CalendarRangeValue) => void;
  defaultValue?: CalendarRangeValue;
};

type CalendarProps = CalendarSingleProps | CalendarMultipleProps | CalendarRangeProps;

const CalendarComponent = (props: CalendarProps) => {
  const mergedProps = mergeProps(
    {
      mode: "single" as const,
      showOutsideDays: true,
      fixedWeeks: false,
      numberOfMonths: 1,
      weekStartsOn: 1 as const,
    },
    props,
  );

  const [local, others] = splitProps(mergedProps, [
    "class",
    "mode",
    "value",
    "onValueChange",
    "defaultValue",
    "showOutsideDays",
    "fixedWeeks",
    "numberOfMonths",
    "disabled",
    "month",
    "onMonthChange",
    "defaultMonth",
    "weekStartsOn",
  ]);

  const formatMonth = (date: Date) => {
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const formatWeekday = (date: Date) => {
    return date.toLocaleString("default", { weekday: "short" }).slice(0, 2);
  };

  return (
    // @ts-expect-error - Calendar component is not typed correctly
    <Calendar
      mode={local.mode}
      value={local.value as Date | null}
      onValueChange={local.onValueChange as (value: Date | null) => void}
      initialValue={local.defaultValue as Date | null}
      month={local.month}
      onMonthChange={local.onMonthChange}
      initialMonth={local.defaultMonth}
      numberOfMonths={local.numberOfMonths}
      fixedWeeks={local.fixedWeeks}
      disableOutsideDays={!local.showOutsideDays}
      disabled={local.disabled}
      startOfWeek={local.weekStartsOn}
    >
      {/* @ts-expect-error - Calendar component is not typed correctly */}
      {(calendarProps) => (
        <div
          data-slot="calendar"
          class={cn(
            "cn-calendar group/calendar w-fit bg-popover p-3",
            "in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
            local.class,
          )}
          {...others}
        >
          <div class="relative flex flex-col gap-4 md:flex-row">
            <Index each={calendarProps.months}>
              {(monthData, index) => (
                <div data-slot="calendar-month" class="flex w-full flex-col gap-4">
                  <div
                    data-slot="calendar-month-caption"
                    class="flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)"
                  >
                    <h2
                      class="select-none font-medium text-sm"
                      data-slot="calendar-label"
                      id={calendarProps.labelIds[index]?.()}
                    >
                      {formatMonth(monthData().month)}
                    </h2>
                  </div>
                  <Calendar.Table index={index} class="w-full border-collapse">
                    <thead data-slot="calendar-weekdays">
                      <tr class="flex">
                        <Index each={calendarProps.weekdays}>
                          {(weekday) => (
                            <Calendar.HeadCell
                              data-slot="calendar-weekday"
                              class="flex-1 select-none rounded-(--cell-radius) font-normal text-[0.8rem] text-muted-foreground"
                            >
                              {formatWeekday(weekday())}
                            </Calendar.HeadCell>
                          )}
                        </Index>
                      </tr>
                    </thead>
                    <tbody data-slot="calendar-weeks">
                      <Index each={monthData().weeks}>
                        {(week) => (
                          <tr data-slot="calendar-week" class="mt-2 flex w-full">
                            <Index each={week()}>
                              {(day) => (
                                <Show when={day()} fallback={<td class="flex-1 p-0" />}>
                                  {(d) => (
                                    <CalendarDay
                                      day={d()}
                                      month={monthData().month}
                                      mode={local.mode}
                                      value={calendarProps.value}
                                    />
                                  )}
                                </Show>
                              )}
                            </Index>
                          </tr>
                        )}
                      </Index>
                    </tbody>
                  </Calendar.Table>
                </div>
              )}
            </Index>
            {/* Navigation */}
            <nav
              data-slot="calendar-nav"
              class="absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1"
            >
              <Calendar.Nav
                action="prev-month"
                as={Button}
                variant="ghost"
                class={cn(
                  buttonVariants({ variant: "ghost" }),
                  "size-(--cell-size) select-none p-0",
                )}
              >
                <ChevronLeft class="size-4" />
                <span class="sr-only">Previous month</span>
              </Calendar.Nav>
              <Calendar.Nav
                action="next-month"
                as={Button}
                variant="ghost"
                class={cn(
                  buttonVariants({ variant: "ghost" }),
                  "size-(--cell-size) select-none p-0",
                )}
              >
                <ChevronRight class="size-4" />
                <span class="sr-only">Next month</span>
              </Calendar.Nav>
            </nav>
          </div>
        </div>
      )}
    </Calendar>
  );
};

type CalendarDayProps = {
  day: Date;
  month: Date;
  mode: "single" | "multiple" | "range";
  value: Date | null | Date[] | { from: Date | null; to: Date | null };
};

const CalendarDay = (props: CalendarDayProps) => {
  const isOutsideMonth = () => props.day.getMonth() !== props.month.getMonth();

  const isSelected = () => {
    const value = props.value;
    if (value === null || value === undefined) return false;

    if (value instanceof Date) {
      return isSameDay(value, props.day);
    }
    if (Array.isArray(value)) {
      return value.some((d) => isSameDay(d, props.day));
    }
    if (typeof value === "object" && "from" in value) {
      const { from, to } = value as CalendarRangeValue;
      if (from && isSameDay(from, props.day)) return true;
      if (to && isSameDay(to, props.day)) return true;
      return false;
    }
    return false;
  };

  const isRangeStart = () => {
    const value = props.value;
    if (!value || typeof value !== "object" || !("from" in value)) return false;
    const { from } = value as CalendarRangeValue;
    return from && isSameDay(from, props.day);
  };

  const isRangeEnd = () => {
    const value = props.value;
    if (!value || typeof value !== "object" || !("from" in value)) return false;
    const { to } = value as CalendarRangeValue;
    return to && isSameDay(to, props.day);
  };

  const isInRange = () => {
    const value = props.value;
    if (!value || typeof value !== "object" || !("from" in value)) return false;
    const { from, to } = value as CalendarRangeValue;
    if (!from || !to) return false;
    return props.day > from && props.day < to;
  };

  const isSingleSelected = () => isSelected() && !isRangeStart() && !isRangeEnd() && !isInRange();

  return (
    <Calendar.Cell
      data-slot="calendar-day"
      class={cn(
        "group/day relative aspect-square h-full w-full flex-1 select-none rounded-(--cell-radius) p-0 text-center",
        "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
        "[&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
        isRangeStart() &&
          "isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
        isRangeEnd() &&
          "isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
        isInRange() && "rounded-none",
      )}
      data-selected={isSelected() || undefined}
      data-outside={isOutsideMonth() || undefined}
    >
      <Calendar.CellTrigger
        day={props.day}
        month={props.month}
        data-slot="calendar-day-button"
        class={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 font-normal leading-none",
          // Focus states
          "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50",
          // Today styling
          "data-[today=true]:data-[selected=true]:rounded-none data-[today=true]:rounded-(--cell-radius) data-[today=true]:bg-muted data-[today=true]:text-foreground",
          // Single selection
          isSingleSelected() && "bg-primary text-primary-foreground",
          // Range selection
          isRangeStart() &&
            "rounded-(--cell-radius) rounded-l-(--cell-radius) bg-primary text-primary-foreground",
          isRangeEnd() &&
            "rounded-(--cell-radius) rounded-r-(--cell-radius) bg-primary text-primary-foreground",
          isInRange() && "rounded-none bg-muted text-foreground",
          // Outside month
          "data-[outside=true]:text-muted-foreground data-[outside=true]:aria-selected:text-muted-foreground",
          // Disabled
          "data-[disabled=true]:text-muted-foreground data-[disabled=true]:opacity-50",
        )}
        data-outside={isOutsideMonth() || undefined}
      >
        {props.day.getDate()}
      </Calendar.CellTrigger>
    </Calendar.Cell>
  );
};

// Helper function
const isSameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

export { CalendarComponent as Calendar, type CalendarProps };
