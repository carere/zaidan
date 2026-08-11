import CalendarPrimitive, {
  type RootChildrenProps as CalendarPrimitiveChildrenProps,
} from "@corvu/calendar";
import { TZDate } from "@date-fns/tz";
import { differenceInCalendarDays, getISOWeek, getWeek, type Locale } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-solid";
import {
  type Component,
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  For,
  Index,
  type JSX,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Switch,
  splitProps,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/registry/kobalte/ui/button";

type CalendarMode = "multiple" | "range" | "single";
type CalendarSingleValue = Date | null;
type CalendarMultipleValue = Date[];
type CalendarRangeValue = { from: Date | undefined; to?: Date | undefined };
type CalendarPrimitiveRangeValue = { from: Date | null; to: Date | null };
type CalendarPrimitiveValue =
  | CalendarMultipleValue
  | CalendarPrimitiveRangeValue
  | CalendarSingleValue;
type CalendarValue = Date | Date[] | CalendarRangeValue | undefined;
type CalendarCaptionLayout = "dropdown" | "dropdown-months" | "dropdown-years" | "label";
type CalendarChevronOrientation = "down" | "left" | "right" | "up";
type CalendarButtonVariant = ButtonProps["variant"];
type CalendarWeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type CalendarNumerals =
  | "arab"
  | "arabext"
  | "beng"
  | "deva"
  | "geez"
  | "gujr"
  | "guru"
  | "khmr"
  | "knda"
  | "laoo"
  | "latn"
  | "mlym"
  | "mymr"
  | "orya"
  | "thai"
  | "tamldec"
  | "telu"
  | "tibt";

type CalendarDateRange = CalendarRangeValue;
type CalendarDateBefore = { before: Date };
type CalendarDateAfter = { after: Date };
type CalendarDateInterval = { after: Date; before: Date };
type CalendarDayOfWeek = { dayOfWeek: number | number[] };
type CalendarMatcher =
  | boolean
  | CalendarDateAfter
  | CalendarDateBefore
  | CalendarDateInterval
  | CalendarDateRange
  | CalendarDayOfWeek
  | Date
  | Date[]
  | ((date: Date) => boolean);

type CalendarDay = {
  date: Date;
  displayMonth: Date;
  isEqualTo: (day: CalendarDay) => boolean;
  outside: boolean;
};

type CalendarWeek = {
  days: CalendarDay[];
  weekNumber: number;
};

type CalendarMonth = {
  date: Date;
  weeks: CalendarWeek[];
};

type CalendarDayModifiers = {
  disabled: boolean;
  focused: boolean;
  hidden: boolean;
  outside: boolean;
  range_end: boolean;
  range_middle: boolean;
  range_start: boolean;
  selected: boolean;
  today: boolean;
  [name: string]: boolean;
};

type CalendarSlot =
  | "button_next"
  | "button_previous"
  | "caption_after_enter"
  | "caption_after_exit"
  | "caption_before_enter"
  | "caption_before_exit"
  | "caption_label"
  | "chevron"
  | "day"
  | "day_button"
  | "disabled"
  | "dropdown"
  | "dropdown_root"
  | "dropdowns"
  | "footer"
  | "focused"
  | "hidden"
  | "month"
  | "month_caption"
  | "month_grid"
  | "months"
  | "months_dropdown"
  | "nav"
  | "outside"
  | "range_end"
  | "range_middle"
  | "range_start"
  | "root"
  | "selected"
  | "today"
  | "week"
  | "week_number"
  | "week_number_header"
  | "weekday"
  | "weekdays"
  | "weeks"
  | "weeks_after_enter"
  | "weeks_after_exit"
  | "weeks_before_enter"
  | "weeks_before_exit"
  | "years_dropdown";

type CalendarClassNames = Partial<Record<CalendarSlot, string>>;
type CalendarStyles = Partial<Record<CalendarSlot, JSX.CSSProperties>>;

type CalendarDateOptions = {
  firstWeekContainsDate?: 1 | 4;
  locale?: Partial<Locale>;
  noonSafe?: boolean;
  numerals?: CalendarNumerals;
  timeZone?: string;
  useAdditionalDayOfYearTokens?: boolean;
  useAdditionalWeekYearTokens?: boolean;
  weekStartsOn?: CalendarWeekStartsOn;
};

type CalendarDateAdapter = {
  format?: (date: Date, format: string) => string;
  [name: string]: unknown;
};

type CalendarFormatters = {
  formatCaption?: (
    month: Date,
    options?: CalendarDateOptions,
    dateLib?: CalendarDateAdapter,
  ) => string;
  formatDay?: (day: Date, options?: CalendarDateOptions, dateLib?: CalendarDateAdapter) => string;
  formatMonthCaption?: (
    month: Date,
    options?: CalendarDateOptions,
    dateLib?: CalendarDateAdapter,
  ) => string;
  formatMonthDropdown?: (
    month: Date,
    options?: CalendarDateOptions,
    dateLib?: CalendarDateAdapter,
  ) => string;
  formatWeekdayName?: (
    weekday: Date,
    options?: CalendarDateOptions,
    dateLib?: CalendarDateAdapter,
  ) => string;
  formatWeekNumber?: (weekNumber: number, options?: CalendarDateOptions) => string;
  formatWeekNumberHeader?: (options?: CalendarDateOptions) => string;
  formatYearCaption?: (
    year: Date,
    options?: CalendarDateOptions,
    dateLib?: CalendarDateAdapter,
  ) => string;
  formatYearDropdown?: (
    year: Date,
    options?: CalendarDateOptions,
    dateLib?: CalendarDateAdapter,
  ) => string;
};

type CalendarLabels = {
  labelDay?: (
    day: Date,
    modifiers: CalendarDayModifiers,
    options?: CalendarDateOptions,
    dateLib?: CalendarDateAdapter,
  ) => string;
  labelDayButton?: (
    day: Date,
    modifiers: CalendarDayModifiers,
    options?: CalendarDateOptions,
    dateLib?: CalendarDateAdapter,
  ) => string;
  labelGrid?: (month: Date, options?: CalendarDateOptions, dateLib?: CalendarDateAdapter) => string;
  labelGridcell?: (
    day: Date,
    modifiers?: CalendarDayModifiers,
    options?: CalendarDateOptions,
    dateLib?: CalendarDateAdapter,
  ) => string;
  labelMonthDropdown?: (options?: CalendarDateOptions) => string;
  labelNav?: (options?: CalendarDateOptions) => string;
  labelNext?: (month: Date | undefined, options?: CalendarDateOptions) => string;
  labelPrevious?: (month: Date | undefined, options?: CalendarDateOptions) => string;
  labelWeekday?: (
    weekday: Date,
    options?: CalendarDateOptions,
    dateLib?: CalendarDateAdapter,
  ) => string;
  labelWeekNumber?: (weekNumber: number, options?: CalendarDateOptions) => string;
  labelWeekNumberHeader?: (options?: CalendarDateOptions) => string;
  labelYearDropdown?: (options?: CalendarDateOptions) => string;
};

type CalendarChevronProps = Omit<ComponentProps<"svg">, "children"> & {
  orientation: CalendarChevronOrientation;
};

type CalendarWeekNumberProps = ComponentProps<"td"> & {
  week: CalendarWeek;
  weekNumber: number;
};

type CalendarDaySlotProps = ComponentProps<"td"> & {
  day: CalendarDay;
  modifiers: CalendarDayModifiers;
};

type CalendarDropdownOption = {
  disabled: boolean;
  label: string;
  value: number;
};

type CalendarDropdownProps = Omit<ComponentProps<"select">, "children"> & {
  classNames: CalendarClassNames;
  components: CalendarComponents;
  options?: CalendarDropdownOption[];
};

type CalendarMonthSlotProps = ComponentProps<"div"> & {
  calendarMonth: CalendarMonth;
  displayIndex: number;
};

type CalendarNavProps = ComponentProps<"nav"> & {
  nextMonth: Date | undefined;
  onNextClick?: (event: MouseEvent) => void;
  onPreviousClick?: (event: MouseEvent) => void;
  previousMonth: Date | undefined;
};

type CalendarRootSlotProps = ComponentProps<"div"> & {
  rootRef: (element: HTMLDivElement) => void;
};

type CalendarWeekProps = ComponentProps<"tr"> & {
  week: CalendarWeek;
};

type CalendarComponents = {
  Button?: Component<ComponentProps<"button">>;
  CaptionLabel?: Component<ComponentProps<"span"> & { displayMonth: Date }>;
  Chevron?: Component<CalendarChevronProps>;
  Day?: Component<CalendarDaySlotProps>;
  DayButton?: Component<CalendarDayButtonProps>;
  Dropdown?: Component<CalendarDropdownProps>;
  DropdownNav?: Component<ComponentProps<"div">>;
  Footer?: Component<ComponentProps<"footer">>;
  Month?: Component<CalendarMonthSlotProps>;
  MonthCaption?: Component<CalendarMonthSlotProps>;
  MonthGrid?: Component<ComponentProps<"table">>;
  Months?: Component<ComponentProps<"div">>;
  MonthsDropdown?: Component<CalendarDropdownProps>;
  Nav?: Component<CalendarNavProps>;
  NextMonthButton?: Component<ComponentProps<"button">>;
  Option?: Component<ComponentProps<"option">>;
  PreviousMonthButton?: Component<ComponentProps<"button">>;
  Root?: Component<CalendarRootSlotProps>;
  Select?: Component<ComponentProps<"select">>;
  Week?: Component<CalendarWeekProps>;
  Weekday?: Component<ComponentProps<"th">>;
  Weekdays?: Component<ComponentProps<"tr">>;
  WeekNumber?: Component<CalendarWeekNumberProps>;
  WeekNumberHeader?: Component<ComponentProps<"th">>;
  Weeks?: Component<ComponentProps<"tbody">>;
  YearsDropdown?: Component<CalendarDropdownProps>;
};

type CalendarDayEventHandler<EventType extends Event> = (
  day: Date,
  modifiers: CalendarDayModifiers,
  event: EventType,
) => void;

type CalendarSelectHandler<Value> = (
  selected: Value,
  triggerDate: Date,
  modifiers: CalendarDayModifiers,
  event: MouseEvent | KeyboardEvent,
) => void;

type CalendarBaseProps = Omit<ComponentProps<"div">, "children" | "onSelect"> & {
  /** Add state markers used by month-transition styles. */
  animate?: boolean;
  /** Focus the active day when the calendar mounts. */
  autoFocus?: boolean;
  /** @deprecated Use autoFocus instead. */
  initialFocus?: boolean;
  /** Visual variant used by the previous and next month buttons. */
  buttonVariant?: CalendarButtonVariant;
  /** Use Monday-based four or five week broadcast months. */
  broadcastCalendar?: boolean;
  /** Controls whether the caption is a label or month/year dropdowns. */
  captionLayout?: CalendarCaptionLayout;
  /** Class overrides using the upstream DayPicker slot names. */
  classNames?: CalendarClassNames;
  /** Solid component overrides for the slots customized by shadcn Calendar. */
  components?: CalendarComponents;
  /** The initially displayed month for an uncontrolled calendar. */
  defaultMonth?: Date;
  /** Prevent all month navigation. */
  disableNavigation?: boolean;
  /** Dates that cannot be selected. */
  disabled?: CalendarMatcher | CalendarMatcher[];
  /** Reset a range if it crosses a disabled date. */
  excludeDisabled?: boolean;
  /** Experimental date-library method overrides passed to custom formatters and labels. */
  dateLib?: CalendarDateAdapter;
  /** Always render six weeks per month. */
  fixedWeeks?: boolean;
  /** Hide the weekday header row. */
  hideWeekdays?: boolean;
  /** Text formatters corresponding to the rendered Calendar slots. */
  formatters?: CalendarFormatters;
  /** Optional footer rendered after the month grid. */
  footer?: JSX.Element;
  /** Hide the previous and next month buttons. */
  hideNavigation?: boolean;
  /** Dates that should remain present but visually hidden. */
  hidden?: CalendarMatcher | CalendarMatcher[];
  /** Accessible labels corresponding to the rendered Calendar controls. */
  labels?: CalendarLabels;
  /** Locale used for month, weekday, day, and data attribute formatting. */
  locale?: Partial<Locale>;
  /** Maximum selected days in multiple mode. */
  max?: number;
  /** Minimum selected days in multiple mode. */
  min?: number;
  /** Controlled month displayed by the calendar. */
  month?: Date;
  /** Called when the displayed month changes. */
  onMonthChange?: (month: Date) => void;
  /** Called after the next-month control is activated. */
  onNextClick?: (month: Date) => void;
  /** Called after the previous-month control is activated. */
  onPrevClick?: (month: Date) => void;
  onDayBlur?: CalendarDayEventHandler<FocusEvent>;
  onDayClick?: CalendarDayEventHandler<MouseEvent>;
  onDayFocus?: CalendarDayEventHandler<FocusEvent>;
  onDayKeyDown?: CalendarDayEventHandler<KeyboardEvent>;
  onDayMouseEnter?: CalendarDayEventHandler<MouseEvent>;
  onDayMouseLeave?: CalendarDayEventHandler<MouseEvent>;
  /** Display this many consecutive months. */
  numberOfMonths?: number;
  /** Navigate by the number of visible months instead of one month. */
  pagedNavigation?: boolean;
  /** Numeral system used by rendered day, year, and week numbers. */
  numerals?: CalendarNumerals;
  /** Keep generated calendar dates at noon in the configured time zone. */
  noonSafe?: boolean;
  /** Position navigation around the caption or after it in DOM and visual order. */
  navLayout?: "after" | "around";
  /** Render the visible months in reverse order. */
  reverseMonths?: boolean;
  /** Render dropdown years in reverse order. */
  reverseYears?: boolean;
  /** Show days from the previous and next month. */
  showOutsideDays?: boolean;
  /** Show the week number column. */
  showWeekNumber?: boolean;
  /** Inline style overrides using the upstream DayPicker slot names. */
  styles?: CalendarStyles;
  /** Inline styles applied when a custom modifier matches. */
  modifiersStyles?: Record<string, JSX.CSSProperties>;
  /** Date treated as today for styling and initial focus. */
  today?: Date;
  /** IANA time zone used by locale-aware labels and formatters. */
  timeZone?: string;
  /** Earliest month available to the caption and navigation controls. */
  startMonth?: Date;
  /** Latest month available to the caption and navigation controls. */
  endMonth?: Date;
  /** First day of the week, where Sunday is 0. */
  weekStartsOn?: CalendarWeekStartsOn;
  /** Use ISO week numbering and Monday as the first weekday. */
  ISOWeek?: boolean;
  /** The January date that must fall in the first local week. */
  firstWeekContainsDate?: 1 | 4;
  /** Allow additional date-fns day-of-year tokens in custom formatting. */
  useAdditionalDayOfYearTokens?: boolean;
  /** Allow additional date-fns week-year tokens in custom formatting. */
  useAdditionalWeekYearTokens?: boolean;

  /** Custom day modifiers, keyed by modifier name. */
  modifiers?: Record<string, CalendarMatcher | CalendarMatcher[] | undefined>;
  /** Classes applied to day cells when a custom modifier matches. */
  modifiersClassNames?: Record<string, string>;
};

type CalendarSingleProps =
  | (CalendarBaseProps & {
      mode: "single";
      onSelect?: CalendarSelectHandler<Date | undefined>;
      required?: false | undefined;
      selected?: Date;
    })
  | (CalendarBaseProps & {
      mode: "single";
      onSelect?: CalendarSelectHandler<Date>;
      required: true;
      selected: Date | undefined;
    });

type CalendarMultipleProps =
  | (CalendarBaseProps & {
      mode: "multiple";
      onSelect?: CalendarSelectHandler<CalendarMultipleValue | undefined>;
      required?: false | undefined;
      selected?: CalendarMultipleValue;
    })
  | (CalendarBaseProps & {
      mode: "multiple";
      onSelect?: CalendarSelectHandler<CalendarMultipleValue>;
      required: true;
      selected: CalendarMultipleValue | undefined;
    });

type CalendarRangeProps =
  | (CalendarBaseProps & {
      mode: "range";
      onSelect?: CalendarSelectHandler<CalendarRangeValue | undefined>;
      required?: false | undefined;
      selected?: CalendarRangeValue;
    })
  | (CalendarBaseProps & {
      mode: "range";
      onSelect?: CalendarSelectHandler<CalendarRangeValue>;
      required: true;
      selected: CalendarRangeValue | undefined;
    });

type CalendarDefaultProps = CalendarBaseProps & {
  mode?: undefined;
  onSelect?: never;
  required?: undefined;
  selected?: never;
};

type CalendarProps =
  | CalendarDefaultProps
  | CalendarMultipleProps
  | CalendarRangeProps
  | CalendarSingleProps;

type CalendarDayButtonProps = Omit<ComponentProps<"button">, "value"> & {
  day: CalendarDay;
  locale?: Partial<Locale>;
  modifiers: CalendarDayModifiers;
  month: Date;
};

const isSameDay = (left: Date | null | undefined, right: Date | null | undefined) => {
  if (!left || !right) return false;
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

const dayTimestamp = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const monthTimestamp = (date: Date) => date.getFullYear() * 12 + date.getMonth();

const createCalendarDay = (date: Date, displayMonth: Date): CalendarDay => ({
  date,
  displayMonth,
  isEqualTo: (day) =>
    isSameDay(day.date, date) && monthTimestamp(day.displayMonth) === monthTimestamp(displayMonth),
  outside: monthTimestamp(date) !== monthTimestamp(displayMonth),
});

const matchesMatcher = (
  date: Date,
  matcher: CalendarMatcher | CalendarMatcher[] | undefined,
): boolean => {
  if (matcher === undefined || matcher === false) return false;
  if (matcher === true) return true;
  if (matcher instanceof Date) return isSameDay(date, matcher);
  if (Array.isArray(matcher)) return matcher.some((item) => matchesMatcher(date, item));
  if (typeof matcher === "function") return matcher(date);

  const timestamp = dayTimestamp(date);
  if ("dayOfWeek" in matcher) {
    const days = Array.isArray(matcher.dayOfWeek) ? matcher.dayOfWeek : [matcher.dayOfWeek];
    return days.includes(date.getDay());
  }
  if ("from" in matcher) {
    if (!matcher.from) return false;
    if (!matcher.to) return timestamp === dayTimestamp(matcher.from);
    return timestamp >= dayTimestamp(matcher.from) && timestamp <= dayTimestamp(matcher.to);
  }
  if ("after" in matcher && "before" in matcher) {
    return timestamp > dayTimestamp(matcher.after) && timestamp < dayTimestamp(matcher.before);
  }
  if ("after" in matcher) return timestamp > dayTimestamp(matcher.after);
  return timestamp < dayTimestamp(matcher.before);
};

const toPrimitiveRange = (
  value: CalendarPrimitiveValue | CalendarValue | undefined,
): CalendarPrimitiveRangeValue | undefined => {
  if (!value || value instanceof Date || Array.isArray(value)) return undefined;
  return { from: value.from ?? null, to: value.to ?? null };
};

const CalendarChevron = (props: CalendarChevronProps) => {
  const [local, others] = splitProps(props, ["aria-hidden", "class", "orientation"]);
  const iconProps = {
    "aria-hidden": !(local["aria-hidden"] === false || local["aria-hidden"] === "false"),
    class: cn("size-4", local.class),
    ...others,
  };

  return (
    <Switch fallback={<ChevronDown {...iconProps} />}>
      <Match when={local.orientation === "left"}>
        <ChevronLeft {...iconProps} />
      </Match>
      <Match when={local.orientation === "right"}>
        <ChevronRight {...iconProps} />
      </Match>
    </Switch>
  );
};

const CalendarWeekNumber = (props: CalendarWeekNumberProps) => {
  const [local, others] = splitProps(props, ["children", "week", "weekNumber"]);
  return (
    <td {...others}>
      <div class="flex size-(--cell-size) items-center justify-center text-center">
        {local.children}
      </div>
    </td>
  );
};

const CalendarRootSlot = (props: CalendarRootSlotProps) => {
  const [local, others] = splitProps(props, ["rootRef"]);
  return <div ref={local.rootRef} {...others} />;
};

const CalendarMonthSlot = (props: CalendarMonthSlotProps) => {
  const [, others] = splitProps(props, ["calendarMonth", "displayIndex"]);
  return <div {...others} />;
};

const CalendarWeekSlot = (props: CalendarWeekProps) => {
  const [, others] = splitProps(props, ["week"]);
  return <tr {...others} />;
};

const CalendarNavSlot = (props: CalendarNavProps) => {
  const [, others] = splitProps(props, [
    "nextMonth",
    "onNextClick",
    "onPreviousClick",
    "previousMonth",
  ]);
  return <nav {...others} />;
};

const CalendarDayButton = (props: CalendarDayButtonProps) => {
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "day",
    "locale",
    "modifiers",
    "month",
  ]);

  return (
    <CalendarPrimitive.CellTrigger
      as={Button}
      day={local.day.date}
      month={local.month}
      role="button"
      type="button"
      variant="ghost"
      size="icon"
      {...others}
      data-day={local.day.date.toLocaleDateString(local.locale?.code)}
      data-focused={local.modifiers.focused || undefined}
      data-outside={local.modifiers.outside || undefined}
      data-range-end={local.modifiers.range_end || undefined}
      data-range-middle={local.modifiers.range_middle || undefined}
      data-range-start={local.modifiers.range_start || undefined}
      data-today={local.modifiers.today || undefined}
      data-selected-single={
        (local.modifiers.selected &&
          !local.modifiers.range_start &&
          !local.modifiers.range_end &&
          !local.modifiers.range_middle) ||
        undefined
      }
      class={cn(
        "z-calendar-day-button relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 font-normal leading-none",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50",
        "data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
        "data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground",
        "data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
        "dark:hover:text-foreground [&>span]:text-xs [&>span]:opacity-70",
        local.class,
      )}
    >
      {local.children}
    </CalendarPrimitive.CellTrigger>
  );
};

type CalendarDayCellProps = {
  classNames?: CalendarClassNames;
  components?: CalendarComponents;
  dateLib?: CalendarDateAdapter;
  dateOptions: CalendarDateOptions;
  day: Date;
  disabled?: CalendarMatcher | CalendarMatcher[];
  focusedDay?: Date;
  formatters?: CalendarFormatters;
  hidden?: CalendarMatcher | CalendarMatcher[];
  interactive: boolean;
  labels?: CalendarLabels;
  locale?: Partial<Locale>;
  modifiers?: Record<string, CalendarMatcher | CalendarMatcher[] | undefined>;
  modifiersClassNames?: Record<string, string>;
  modifiersStyles?: Record<string, JSX.CSSProperties>;
  month: Date;
  numerals?: CalendarNumerals;
  onDayBlur?: CalendarDayEventHandler<FocusEvent>;
  onDayClick?: CalendarDayEventHandler<MouseEvent>;
  onDayFocus?: CalendarDayEventHandler<FocusEvent>;
  onDayKeyDown?: CalendarDayEventHandler<KeyboardEvent>;
  onDayMouseEnter?: CalendarDayEventHandler<MouseEvent>;
  onDayMouseLeave?: CalendarDayEventHandler<MouseEvent>;
  onDaySelect: (
    day: Date,
    modifiers: CalendarDayModifiers,
    event: MouseEvent | KeyboardEvent,
  ) => boolean;
  disableNavigation: boolean;
  showOutsideDays: boolean;
  showWeekNumber: boolean;
  styles?: CalendarStyles;
  textDirection: "ltr" | "rtl";
  timeZone?: string;
  today: Date;
  value: CalendarPrimitiveValue;
  visibleEndDay: Date;
  visibleStartDay: Date;
  weekStartsOn: CalendarWeekStartsOn;
};

const CalendarDayCell = (props: CalendarDayCellProps) => {
  const semanticDate = (date: Date) =>
    props.timeZone
      ? TZDate.tz(
          props.timeZone,
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          props.dateOptions.noonSafe ? 12 : 0,
        )
      : date;
  const day = createMemo(() => semanticDate(props.day));
  const month = createMemo(() => semanticDate(props.month));
  const isOutside = () =>
    day().getMonth() !== month().getMonth() || day().getFullYear() !== month().getFullYear();
  const calendarDay = createMemo<CalendarDay>(() => createCalendarDay(day(), month()));
  const isToday = () => isSameDay(day(), props.today);
  const isDisabled = () => matchesMatcher(day(), props.disabled);
  const isHidden = () => matchesMatcher(day(), props.hidden);
  const isRange = () => toPrimitiveRange(props.value as CalendarValue);
  const isRangeStart = () => isSameDay(day(), isRange()?.from);
  const isRangeEnd = () => isSameDay(day(), isRange()?.to);
  const isRangeMiddle = () => {
    const range = isRange();
    if (!range?.from || !range.to) return false;
    const timestamp = dayTimestamp(day());
    return timestamp > dayTimestamp(range.from) && timestamp < dayTimestamp(range.to);
  };
  const isSelected = () => {
    if (props.value instanceof Date) return isSameDay(day(), props.value);
    if (Array.isArray(props.value)) {
      return props.value.some((date) => isSameDay(day(), date));
    }
    const range = toPrimitiveRange(props.value as CalendarValue);
    if (!range?.from) return false;
    if (!range.to) return isSameDay(day(), range.from);
    const timestamp = dayTimestamp(day());
    return timestamp >= dayTimestamp(range.from) && timestamp <= dayTimestamp(range.to);
  };

  const customModifiers = createMemo(() =>
    Object.fromEntries(
      Object.entries(props.modifiers ?? {}).map(([name, matcher]) => [
        name,
        matchesMatcher(day(), matcher),
      ]),
    ),
  );

  const modifiers = createMemo<CalendarDayModifiers>(() => ({
    ...customModifiers(),
    disabled: isDisabled(),
    focused: isSameDay(day(), props.focusedDay),
    hidden: isHidden(),
    outside: isOutside(),
    range_end: isRangeEnd(),
    range_middle: isRangeMiddle(),
    range_start: isRangeStart(),
    selected: isSelected(),
    today: isToday(),
  }));

  const customModifierClasses = () =>
    Object.entries(props.modifiersClassNames ?? {})
      .filter(([name]) => modifiers()[name])
      .map(([, className]) => className);

  const customModifierStyles = () =>
    Object.assign(
      {},
      ...Object.entries(props.modifiersStyles ?? {})
        .filter(([name]) => modifiers()[name])
        .map(([, style]) => style),
    );

  const dayStyles = () => ({
    ...props.styles?.day,
    ...(modifiers().focused ? props.styles?.focused : undefined),
    ...(isSelected() ? props.styles?.selected : undefined),
    ...(isRangeStart() ? props.styles?.range_start : undefined),
    ...(isRangeMiddle() ? props.styles?.range_middle : undefined),
    ...(isRangeEnd() ? props.styles?.range_end : undefined),
    ...(isToday() ? props.styles?.today : undefined),
    ...(isOutside() ? props.styles?.outside : undefined),
    ...(isDisabled() ? props.styles?.disabled : undefined),
    ...(isHidden() ? props.styles?.hidden : undefined),
    ...customModifierStyles(),
  });

  const slotClass = (slot: keyof CalendarClassNames, fallback: string) =>
    props.classNames?.[slot] ?? fallback;

  const DayButton = () => props.components?.DayButton ?? CalendarDayButton;
  const Day = () => props.components?.Day ?? "td";
  const isoDay = () =>
    `${day().getFullYear()}-${String(day().getMonth() + 1).padStart(2, "0")}-${String(
      day().getDate(),
    ).padStart(2, "0")}`;
  const monthId = () => `${day().getFullYear()}-${String(day().getMonth() + 1).padStart(2, "0")}`;
  const defaultDayLabel = (includeSelected: boolean) => {
    let label = day().toLocaleDateString(props.locale?.code, {
      day: "numeric",
      month: "long",
      numberingSystem: props.numerals,
      timeZone: props.timeZone,
      weekday: "long",
      year: "numeric",
    });
    if (modifiers().today) label = `Today, ${label}`;
    if (includeSelected && modifiers().selected) label = `${label}, selected`;
    return label;
  };
  const hiddenCellClass = () =>
    cn(
      "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none",
      slotClass("day", ""),
      isOutside() && slotClass("outside", "text-muted-foreground"),
      isDisabled() && slotClass("disabled", "text-muted-foreground opacity-50"),
      slotClass("hidden", "invisible"),
    );
  const modifyDate = (
    source: Date,
    modification: { day?: number; month?: number; year?: number },
  ) => {
    const year = source.getFullYear() + (modification.year ?? 0);
    const month = source.getMonth() + (modification.month ?? 0);
    let date = source.getDate() + (modification.day ?? 0);
    if (modification.month) {
      date = Math.min(new Date(year, month + 1, 0).getDate(), date);
    }
    return semanticDate(new Date(year, month, date));
  };
  const nextAvailableDate = (
    modification: { day?: number; month?: number; year?: number },
    retry = true,
  ) => {
    let candidate = day();
    for (let iteration = 0; iteration <= 365; iteration += 1) {
      candidate = modifyDate(candidate, modification);
      if (!matchesMatcher(candidate, props.disabled)) return candidate;
      if (!retry) return undefined;
    }
    return undefined;
  };
  const keyboardTarget = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      return nextAvailableDate({ day: props.textDirection === "rtl" ? 1 : -1 });
    }
    if (event.key === "ArrowRight") {
      return nextAvailableDate({ day: props.textDirection === "rtl" ? -1 : 1 });
    }
    if (event.key === "ArrowUp") return nextAvailableDate({ day: -7 });
    if (event.key === "ArrowDown") return nextAvailableDate({ day: 7 });
    if (event.key === "Home") {
      const offset = (day().getDay() - props.weekStartsOn + 7) % 7;
      return nextAvailableDate(
        { day: props.textDirection === "rtl" ? 6 - offset : -offset },
        false,
      );
    }
    if (event.key === "End") {
      const offset = (props.weekStartsOn + 6 - day().getDay() + 7) % 7;
      return nextAvailableDate(
        { day: props.textDirection === "rtl" ? -(6 - offset) : offset },
        false,
      );
    }
    if (event.key === "PageUp") {
      return nextAvailableDate(event.shiftKey ? { year: -1 } : { month: -1 });
    }
    if (event.key === "PageDown") {
      return nextAvailableDate(event.shiftKey ? { year: 1 } : { month: 1 });
    }
    return undefined;
  };
  const preventDisabledNavigation = (event: KeyboardEvent) => {
    if (!props.disableNavigation || event.defaultPrevented) return;
    const target = keyboardTarget(event);
    if (
      target &&
      (dayTimestamp(target) < dayTimestamp(props.visibleStartDay) ||
        dayTimestamp(target) > dayTimestamp(props.visibleEndDay))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Show
      when={!isHidden() && (props.showOutsideDays || !isOutside())}
      fallback={
        <Dynamic
          component={Day()}
          day={calendarDay()}
          modifiers={modifiers()}
          role="gridcell"
          data-day={isoDay()}
          data-disabled={isDisabled() || undefined}
          data-focused={modifiers().focused || undefined}
          data-hidden="true"
          data-month={isOutside() ? monthId() : undefined}
          data-outside={isOutside() || undefined}
          data-selected={isSelected() || undefined}
          data-today={isToday() || undefined}
          aria-selected={isSelected() || undefined}
          class={hiddenCellClass()}
          style={dayStyles()}
        />
      }
    >
      <CalendarPrimitive.Cell
        as={Day()}
        day={calendarDay()}
        modifiers={modifiers()}
        aria-selected={isSelected() || undefined}
        data-day={isoDay()}
        data-disabled={isDisabled() || undefined}
        data-focused={modifiers().focused || undefined}
        data-hidden={isHidden() || undefined}
        data-month={isOutside() ? monthId() : undefined}
        data-outside={isOutside() || undefined}
        data-selected={isSelected() || undefined}
        data-today={isToday() || undefined}
        aria-label={
          props.interactive
            ? undefined
            : (props.labels?.labelGridcell?.(
                day(),
                modifiers(),
                props.dateOptions,
                props.dateLib,
              ) ?? defaultDayLabel(false))
        }
        role="gridcell"
        style={dayStyles()}
        class={cn(
          "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
            : "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
          "[&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
          slotClass("day", ""),
          modifiers().focused && slotClass("focused", ""),
          isSelected() && slotClass("selected", ""),
          isRangeStart() &&
            slotClass(
              "range_start",
              "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
            ),
          isRangeMiddle() && slotClass("range_middle", "rounded-none"),
          isRangeEnd() &&
            slotClass(
              "range_end",
              "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
            ),
          isToday() &&
            slotClass(
              "today",
              "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
            ),
          isOutside() &&
            slotClass("outside", "text-muted-foreground aria-selected:text-muted-foreground"),
          isDisabled() && slotClass("disabled", "text-muted-foreground opacity-50"),
          customModifierClasses(),
        )}
      >
        <Show
          when={props.interactive}
          fallback={
            props.formatters?.formatDay?.(day(), props.dateOptions, props.dateLib) ??
            new Intl.NumberFormat(props.locale?.code, {
              numberingSystem: props.numerals,
              useGrouping: false,
            }).format(day().getDate())
          }
        >
          <Dynamic
            component={DayButton()}
            day={calendarDay()}
            month={props.month}
            modifiers={modifiers()}
            locale={props.locale}
            aria-label={
              props.labels?.labelDayButton?.(
                day(),
                modifiers(),
                props.dateOptions,
                props.dateLib,
              ) ??
              props.labels?.labelDay?.(day(), modifiers(), props.dateOptions, props.dateLib) ??
              defaultDayLabel(true)
            }
            onBlur={(event: FocusEvent) => props.onDayBlur?.(day(), modifiers(), event)}
            onClick={(event: MouseEvent) => {
              props.onDaySelect(day(), modifiers(), event);
              props.onDayClick?.(day(), modifiers(), event);
            }}
            onFocus={(event: FocusEvent) => props.onDayFocus?.(day(), modifiers(), event)}
            onKeyDown={(event: KeyboardEvent) => {
              props.onDayKeyDown?.(day(), modifiers(), event);
              preventDisabledNavigation(event);
            }}
            onMouseEnter={(event: MouseEvent) => props.onDayMouseEnter?.(day(), modifiers(), event)}
            onMouseLeave={(event: MouseEvent) => props.onDayMouseLeave?.(day(), modifiers(), event)}
            style={props.styles?.day_button}
            class={slotClass("day_button", "")}
          >
            <span>
              {props.formatters?.formatDay?.(day(), props.dateOptions, props.dateLib) ??
                new Intl.NumberFormat(props.locale?.code, {
                  numberingSystem: props.numerals,
                  useGrouping: false,
                }).format(day().getDate())}
            </span>
          </Dynamic>
        </Show>
      </CalendarPrimitive.Cell>
    </Show>
  );
};

const Calendar = (props: CalendarProps) => {
  const [local, others] = splitProps(props, [
    "ISOWeek",
    "animate",
    "autoFocus",
    "buttonVariant",
    "broadcastCalendar",
    "captionLayout",
    "class",
    "classNames",
    "components",
    "dateLib",
    "defaultMonth",
    "disableNavigation",
    "disabled",
    "endMonth",
    "excludeDisabled",
    "firstWeekContainsDate",
    "fixedWeeks",
    "footer",
    "formatters",
    "hidden",
    "hideNavigation",
    "hideWeekdays",
    "initialFocus",
    "labels",
    "locale",
    "max",
    "min",
    "mode",
    "modifiers",
    "modifiersClassNames",
    "modifiersStyles",
    "month",
    "navLayout",
    "noonSafe",
    "numerals",
    "numberOfMonths",
    "onDayBlur",
    "onDayClick",
    "onDayFocus",
    "onDayKeyDown",
    "onDayMouseEnter",
    "onDayMouseLeave",
    "onMonthChange",
    "onNextClick",
    "onPrevClick",
    "onSelect",
    "pagedNavigation",
    "ref",
    "required",
    "reverseMonths",
    "reverseYears",
    "selected",
    "showOutsideDays",
    "showWeekNumber",
    "startMonth",
    "styles",
    "today",
    "timeZone",
    "useAdditionalDayOfYearTokens",
    "useAdditionalWeekYearTokens",
    "weekStartsOn",
  ]);

  let rootElement: HTMLDivElement | undefined;
  const mode = (): CalendarMode | undefined => local.mode;
  const showOutsideDays = () => local.showOutsideDays ?? true;
  const showWeekNumber = () => local.showWeekNumber ?? false;
  const numberOfMonths = () => local.numberOfMonths ?? 1;
  const autoFocus = () => local.autoFocus ?? local.initialFocus ?? false;
  const captionLayout = (): CalendarCaptionLayout => local.captionLayout ?? "label";
  const buttonVariant = (): CalendarButtonVariant => local.buttonVariant ?? "ghost";
  const CalendarNavButton: Component<ComponentProps<"button">> = (props) => (
    <Button {...props} class={props.class} variant={buttonVariant()} size="icon" />
  );
  const weekStartsOn = (): CalendarWeekStartsOn =>
    local.ISOWeek || local.broadcastCalendar
      ? 1
      : (local.weekStartsOn ?? local.locale?.options?.weekStartsOn ?? 0);
  const inTimeZone = (date: Date) => (local.timeZone ? TZDate.tz(local.timeZone, date) : date);
  const normalizeCalendarDate = (date: Date) => {
    const zoned = inTimeZone(date);
    return local.timeZone && local.noonSafe
      ? TZDate.tz(local.timeZone, zoned.getFullYear(), zoned.getMonth(), zoned.getDate(), 12)
      : zoned;
  };
  const makeCalendarDate = (year: number, month: number, date = 1) =>
    local.timeZone
      ? TZDate.tz(local.timeZone, year, month, date, local.noonSafe ? 12 : 0)
      : new Date(year, month, date, local.noonSafe ? 12 : 0);
  const cloneCalendarDate = (date: Date) =>
    local.timeZone ? TZDate.tz(local.timeZone, date) : new Date(date);
  const today = () => normalizeCalendarDate(local.today ?? new Date());
  const currentYear = () => today().getFullYear();
  const dropdownStartMonth = () =>
    local.startMonth
      ? normalizeCalendarDate(local.startMonth)
      : makeCalendarDate(currentYear() - 100, 0);
  const dropdownEndMonth = () =>
    local.endMonth ? normalizeCalendarDate(local.endMonth) : makeCalendarDate(currentYear(), 11);
  const navigationStartMonth = () =>
    local.startMonth
      ? normalizeCalendarDate(local.startMonth)
      : captionLayout() === "label"
        ? undefined
        : dropdownStartMonth();
  const navigationEndMonth = () =>
    local.endMonth
      ? normalizeCalendarDate(local.endMonth)
      : captionLayout() === "label"
        ? undefined
        : dropdownEndMonth();
  const clampMonth = (date: Date) => {
    const start = navigationStartMonth();
    const end = navigationEndMonth();
    if (start && monthTimestamp(date) < monthTimestamp(start)) return start;
    if (end) {
      const requestedLatestStart = makeCalendarDate(
        end.getFullYear(),
        end.getMonth() - numberOfMonths() + 1,
      );
      const latestStart =
        start && monthTimestamp(requestedLatestStart) < monthTimestamp(start)
          ? start
          : requestedLatestStart;
      if (monthTimestamp(date) > monthTimestamp(latestStart)) return latestStart;
    }
    return date;
  };
  const dateOptions = (): CalendarDateOptions => ({
    firstWeekContainsDate: local.firstWeekContainsDate,
    locale: local.locale,
    noonSafe: local.noonSafe,
    numerals: local.numerals,
    timeZone: local.timeZone,
    useAdditionalDayOfYearTokens: local.useAdditionalDayOfYearTokens,
    useAdditionalWeekYearTokens: local.useAdditionalWeekYearTokens,
    weekStartsOn: weekStartsOn(),
  });
  const numberFormatter = () =>
    new Intl.NumberFormat(local.locale?.code, {
      numberingSystem: local.numerals,
      useGrouping: false,
    });
  const formatNumber = (value: number) => numberFormatter().format(value);
  const getBroadcastWeeks = (month: Date) => {
    const first = makeCalendarDate(month.getFullYear(), month.getMonth());
    const day = first.getDay() === 0 ? 7 : first.getDay();
    const start = cloneCalendarDate(first);
    start.setDate(first.getDate() - day + 1);
    const fifthWeekEnd = cloneCalendarDate(start);
    fifthWeekEnd.setDate(start.getDate() + 34);
    const weekCount = local.fixedWeeks || fifthWeekEnd.getMonth() === month.getMonth() ? 5 : 4;
    return Array.from({ length: weekCount }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_unused, dayIndex) => {
        const date = cloneCalendarDate(start);
        date.setDate(start.getDate() + weekIndex * 7 + dayIndex);
        return date;
      }),
    );
  };

  const isDisabled = (date: Date) => {
    const start = navigationStartMonth();
    const end = navigationEndMonth();
    return (
      matchesMatcher(date, local.disabled) ||
      matchesMatcher(date, local.hidden) ||
      (start !== undefined && monthTimestamp(date) < monthTimestamp(start)) ||
      (end !== undefined && monthTimestamp(date) > monthTimestamp(end))
    );
  };

  const initialSelected = props.selected;
  const [internalSingleValue, setInternalSingleValue] = createSignal<Date | undefined>(
    initialSelected instanceof Date ? initialSelected : undefined,
  );
  const [internalMultipleValue, setInternalMultipleValue] = createSignal<Date[] | undefined>(
    Array.isArray(initialSelected) ? initialSelected : undefined,
  );
  const [internalRangeValue, setInternalRangeValue] = createSignal<CalendarRangeValue | undefined>(
    initialSelected && !(initialSelected instanceof Date) && !Array.isArray(initialSelected)
      ? initialSelected
      : undefined,
  );
  const isSelectionControlled = () => typeof local.onSelect === "function";
  const singleValue = () =>
    (isSelectionControlled() && local.mode === "single"
      ? (local.selected as Date | undefined)
      : internalSingleValue()) ?? null;
  const multipleValue = () =>
    (isSelectionControlled() && local.mode === "multiple"
      ? (local.selected as Date[] | undefined)
      : internalMultipleValue()) ?? [];
  const rangeValue = () =>
    toPrimitiveRange(
      isSelectionControlled() && local.mode === "range"
        ? (local.selected as CalendarRangeValue | undefined)
        : internalRangeValue(),
    ) ?? { from: null, to: null };

  const rangeContainsDisabled = (range: CalendarRangeValue) => {
    if (!range.from || !range.to) return false;
    for (
      const day = cloneCalendarDate(range.from);
      day <= range.to;
      day.setDate(day.getDate() + 1)
    ) {
      if (isDisabled(day)) return true;
    }
    return false;
  };

  const addToRange = (day: Date): CalendarRangeValue | undefined => {
    const current =
      isSelectionControlled() && local.mode === "range"
        ? (local.selected as CalendarRangeValue | undefined)
        : internalRangeValue();
    const from = current?.from;
    const to = current?.to;
    let next: CalendarRangeValue | undefined;

    if (!from && !to) next = { from: day, to: local.min && local.min > 0 ? undefined : day };
    else if (from && !to) {
      if (isSameDay(from, day)) next = local.required ? { from } : undefined;
      else if (day < from) next = { from: day, to: from };
      else next = { from, to: day };
    } else if (from && to) {
      if (isSameDay(from, day) && isSameDay(to, day)) {
        next = local.required ? { from, to } : undefined;
      } else if (isSameDay(from, day)) {
        next = { from, to: local.min && local.min > 0 ? undefined : day };
      } else if (isSameDay(to, day)) {
        next = { from: day, to: local.min && local.min > 0 ? undefined : day };
      } else if (day < from) next = { from: day, to };
      else next = { from, to: day };
    }

    if (next?.from && next.to) {
      const difference = differenceInCalendarDays(next.to, next.from);
      if ((local.max ?? 0) > 0 && difference > (local.max ?? 0)) next = { from: day };
      else if ((local.min ?? 0) > 1 && difference < (local.min ?? 0)) next = { from: day };
      else if (local.excludeDisabled && rangeContainsDisabled(next)) next = { from: day };
    }
    return next;
  };

  const selectDay = (
    day: Date,
    modifiers: CalendarDayModifiers,
    event: MouseEvent | KeyboardEvent,
  ) => {
    if (mode() === "single") {
      const current = singleValue();
      const next = !local.required && isSameDay(current, day) ? undefined : day;
      if (!isSelectionControlled()) setInternalSingleValue(next);
      if (local.required) {
        (local.onSelect as CalendarSelectHandler<Date> | undefined)?.(
          next ?? day,
          day,
          modifiers,
          event,
        );
      } else {
        (local.onSelect as CalendarSelectHandler<Date | undefined> | undefined)?.(
          next,
          day,
          modifiers,
          event,
        );
      }
      return;
    }
    if (mode() === "multiple") {
      const current = multipleValue();
      const selected = current.some((date) => isSameDay(date, day));
      let next: Date[] | undefined;
      if (selected) {
        if (current.length === local.min || (local.required && current.length === 1)) return;
        next = current.filter((date) => !isSameDay(date, day));
      } else if (current.length === local.max) next = [day];
      else next = [...current, day];
      if (!isSelectionControlled()) setInternalMultipleValue(next);
      (local.onSelect as CalendarSelectHandler<Date[] | undefined> | undefined)?.(
        next,
        day,
        modifiers,
        event,
      );
      return;
    }
    if (mode() === "range") {
      const next = addToRange(day);
      if (!isSelectionControlled()) setInternalRangeValue(next);
      if (local.required) {
        if (next) {
          (local.onSelect as CalendarSelectHandler<CalendarRangeValue> | undefined)?.(
            next,
            day,
            modifiers,
            event,
          );
        }
      } else {
        (local.onSelect as CalendarSelectHandler<CalendarRangeValue | undefined> | undefined)?.(
          next,
          day,
          modifiers,
          event,
        );
      }
    }
  };

  const initialFocusedDay = () => {
    const displayMonth = clampMonth(
      normalizeCalendarDate(local.month ?? local.defaultMonth ?? today()),
    );
    const lastDisplayMonth = makeCalendarDate(
      displayMonth.getFullYear(),
      displayMonth.getMonth() + numberOfMonths() - 1,
    );
    const isVisible = (date: Date) =>
      monthTimestamp(date) >= monthTimestamp(displayMonth) &&
      monthTimestamp(date) <= monthTimestamp(lastDisplayMonth) &&
      !isDisabled(date);
    const selected =
      mode() === "single"
        ? singleValue()
        : mode() === "multiple"
          ? multipleValue()[0]
          : mode() === "range"
            ? rangeValue().from
            : undefined;
    if (selected && isVisible(selected)) return selected;
    if (isVisible(today())) return today();
    const firstAvailable = makeCalendarDate(displayMonth.getFullYear(), displayMonth.getMonth());
    const lastVisibleDay = makeCalendarDate(
      lastDisplayMonth.getFullYear(),
      lastDisplayMonth.getMonth() + 1,
      0,
    );
    while (firstAvailable <= lastVisibleDay) {
      if (!isDisabled(firstAvailable)) return firstAvailable;
      firstAvailable.setDate(firstAvailable.getDate() + 1);
    }
    return displayMonth;
  };
  const [focusedDay, setFocusedDay] = createSignal<Date | undefined>(
    autoFocus() ? initialFocusedDay() : undefined,
  );
  const handleDayFocus: CalendarDayEventHandler<FocusEvent> = (day, modifiers, event) => {
    setFocusedDay(day);
    local.onDayFocus?.(day, modifiers, event);
  };
  const handleDayBlur: CalendarDayEventHandler<FocusEvent> = (day, modifiers, event) => {
    setFocusedDay(undefined);
    local.onDayBlur?.(day, modifiers, event);
  };

  const setRootRef = (element: HTMLDivElement) => {
    rootElement = element;
    if (typeof local.ref === "function") local.ref(element);
  };

  onMount(() => {
    if (!autoFocus()) return;
    queueMicrotask(() =>
      rootElement?.querySelector<HTMLElement>("[data-focused='true'] button")?.focus(),
    );
  });

  const slotClass = (slot: keyof CalendarClassNames, fallback: string) =>
    local.classNames?.[slot] ?? fallback;

  const monthOptions = (date: Date) =>
    Array.from({ length: 12 }, (_, month) => makeCalendarDate(date.getFullYear(), month));

  const yearOptions = () => {
    const years = Array.from(
      { length: dropdownEndMonth().getFullYear() - dropdownStartMonth().getFullYear() + 1 },
      (_, index) => dropdownStartMonth().getFullYear() + index,
    );
    return local.reverseYears ? years.reverse() : years;
  };

  const formatCaption = (date: Date) =>
    local.formatters?.formatCaption?.(date, dateOptions(), local.dateLib) ??
    date.toLocaleDateString(local.locale?.code, {
      month: "long",
      numberingSystem: local.numerals,
      timeZone: local.timeZone,
      year: "numeric",
    });
  const formatMonthDropdown = (date: Date) =>
    local.formatters?.formatMonthDropdown?.(date, dateOptions(), local.dateLib) ??
    date.toLocaleDateString(local.locale?.code, {
      month: "short",
      numberingSystem: local.numerals,
      timeZone: local.timeZone,
    });
  const formatYearDropdown = (date: Date) =>
    local.formatters?.formatYearDropdown?.(date, dateOptions(), local.dateLib) ??
    formatNumber(date.getFullYear());
  const formatWeekday = (date: Date) =>
    local.formatters?.formatWeekdayName?.(date, dateOptions(), local.dateLib) ??
    date
      .toLocaleDateString(local.locale?.code, {
        timeZone: local.timeZone,
        weekday: "short",
      })
      .slice(0, 2);

  const Chevron = () => local.components?.Chevron ?? CalendarChevron;
  const CaptionLabel = () => local.components?.CaptionLabel ?? "span";
  const DropdownNav = () => local.components?.DropdownNav ?? "div";
  const MonthDropdown = () =>
    local.components?.MonthsDropdown ?? local.components?.Dropdown ?? CalendarDropdown;
  const YearDropdown = () =>
    local.components?.YearsDropdown ?? local.components?.Dropdown ?? CalendarDropdown;
  const Option = () => local.components?.Option ?? "option";
  const Root = () => local.components?.Root ?? CalendarRootSlot;
  const WeekNumber = () => local.components?.WeekNumber ?? CalendarWeekNumber;

  function CalendarDropdown(props: CalendarDropdownProps) {
    const [dropdown, selectProps] = splitProps(props, ["classNames", "components", "options"]);
    const selectedOption = () =>
      dropdown.options?.find((option) => option.value === Number(selectProps.value));
    return (
      <span
        data-disabled={selectProps.disabled || undefined}
        class={cn(
          "z-calendar-dropdown-root relative rounded-(--cell-radius)",
          slotClass("dropdown_root", ""),
        )}
        style={local.styles?.dropdown_root}
      >
        <Dynamic
          component={local.components?.Select ?? "select"}
          {...selectProps}
          class={cn(
            "absolute inset-0 z-10 cursor-pointer bg-popover opacity-0",
            slotClass("dropdown", ""),
            selectProps.class,
          )}
          style={selectProps.style ?? local.styles?.dropdown}
        >
          <For each={dropdown.options}>
            {(option) => (
              <Dynamic component={Option()} value={option.value} disabled={option.disabled}>
                {option.label}
              </Dynamic>
            )}
          </For>
        </Dynamic>
        <span
          aria-hidden="true"
          class={cn(
            "z-calendar-caption-label flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
            slotClass("caption_label", ""),
          )}
          style={local.styles?.caption_label}
        >
          {selectedOption()?.label}
          <Dynamic component={Chevron()} orientation="down" class="size-3.5" />
        </span>
      </span>
    );
  }

  const renderMonthDropdown = (month: Date, setMonth: (month: Date) => void) => (
    <Dynamic
      component={MonthDropdown()}
      aria-label={local.labels?.labelMonthDropdown?.(dateOptions()) ?? "Choose the month"}
      disabled={local.disableNavigation}
      class={slotClass("months_dropdown", "")}
      style={local.styles?.months_dropdown}
      classNames={local.classNames ?? {}}
      components={local.components ?? {}}
      options={monthOptions(month).map((option) => ({
        disabled:
          monthTimestamp(option) < monthTimestamp(dropdownStartMonth()) ||
          monthTimestamp(option) > monthTimestamp(dropdownEndMonth()),
        label: formatMonthDropdown(option),
        value: option.getMonth(),
      }))}
      value={month.getMonth()}
      onChange={(event: Event & { currentTarget: HTMLSelectElement }) =>
        setMonth(makeCalendarDate(month.getFullYear(), Number(event.currentTarget.value)))
      }
    />
  );

  const renderYearDropdown = (month: Date, setMonth: (month: Date) => void) => (
    <Dynamic
      component={YearDropdown()}
      aria-label={local.labels?.labelYearDropdown?.(dateOptions()) ?? "Choose the year"}
      disabled={local.disableNavigation}
      class={slotClass("years_dropdown", "")}
      style={local.styles?.years_dropdown}
      classNames={local.classNames ?? {}}
      components={local.components ?? {}}
      options={yearOptions().map((year) => ({
        disabled: false,
        label: formatYearDropdown(makeCalendarDate(year, month.getMonth())),
        value: year,
      }))}
      value={month.getFullYear()}
      onChange={(event: Event & { currentTarget: HTMLSelectElement }) =>
        setMonth(makeCalendarDate(Number(event.currentTarget.value), month.getMonth()))
      }
    />
  );

  const renderCaption = (month: Date, setMonth: (month: Date) => void) => (
    <Show
      when={captionLayout() !== "label"}
      fallback={
        <Dynamic
          component={CaptionLabel()}
          displayMonth={month}
          aria-live="polite"
          role="status"
          class={cn(
            "z-calendar-caption text-sm font-medium select-none",
            slotClass("caption_label", ""),
          )}
          style={local.styles?.caption_label}
        >
          {local.formatters?.formatMonthCaption?.(month, dateOptions(), local.dateLib) ??
            formatCaption(month)}
        </Dynamic>
      }
    >
      <Dynamic
        component={DropdownNav()}
        class={cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          slotClass("dropdowns", ""),
        )}
        style={local.styles?.dropdowns}
      >
        <Show
          when={captionLayout() !== "dropdown-years"}
          fallback={<span>{formatMonthDropdown(month)}</span>}
        >
          {renderMonthDropdown(month, setMonth)}
        </Show>
        <Show
          when={captionLayout() !== "dropdown-months"}
          fallback={<span>{formatYearDropdown(month)}</span>}
        >
          {renderYearDropdown(month, setMonth)}
        </Show>
        <span class="sr-only" aria-live="polite" role="status">
          {formatCaption(month)}
        </span>
      </Dynamic>
    </Show>
  );

  const renderCalendar = (calendarProps: CalendarPrimitiveChildrenProps) => {
    const visibleValue = (): CalendarPrimitiveValue => {
      if (mode() === "multiple") return calendarProps.value as CalendarMultipleValue;
      if (mode() === "range") return calendarProps.value as CalendarPrimitiveRangeValue;
      return calendarProps.value as CalendarSingleValue;
    };
    const displayedMonths = () => {
      const start = navigationStartMonth();
      const end = navigationEndMonth();
      const months = calendarProps.months
        .map((month, index) => ({ index, month }))
        .filter(
          ({ month }) =>
            (!start || monthTimestamp(month.month) >= monthTimestamp(start)) &&
            (!end || monthTimestamp(month.month) <= monthTimestamp(end)),
        );
      return local.reverseMonths ? months.reverse() : months;
    };
    const firstVisibleMonth = () => displayedMonths()[0]?.month.month ?? calendarProps.month;
    const lastVisibleMonth = () => displayedMonths().at(-1)?.month.month ?? calendarProps.month;
    const previousDisabled = () => {
      const boundary = navigationStartMonth();
      return (
        local.disableNavigation ||
        (boundary !== undefined && monthTimestamp(firstVisibleMonth()) <= monthTimestamp(boundary))
      );
    };
    const nextDisabled = () => {
      const boundary = navigationEndMonth();
      return (
        local.disableNavigation ||
        (boundary !== undefined && monthTimestamp(lastVisibleMonth()) >= monthTimestamp(boundary))
      );
    };
    const navigationStep = () => (local.pagedNavigation ? numberOfMonths() : 1);
    const previousAction = () =>
      local.pagedNavigation
        ? (date: Date) => makeCalendarDate(date.getFullYear(), date.getMonth() - numberOfMonths())
        : ("prev-month" as const);
    const nextAction = () =>
      local.pagedNavigation
        ? (date: Date) => makeCalendarDate(date.getFullYear(), date.getMonth() + numberOfMonths())
        : ("next-month" as const);
    const previousMonth = () =>
      makeCalendarDate(
        firstVisibleMonth().getFullYear(),
        firstVisibleMonth().getMonth() - navigationStep(),
      );
    const nextMonth = () =>
      makeCalendarDate(
        firstVisibleMonth().getFullYear(),
        firstVisibleMonth().getMonth() + navigationStep(),
      );
    const PreviousButton = () =>
      local.components?.PreviousMonthButton ?? local.components?.Button ?? CalendarNavButton;
    const NextButton = () =>
      local.components?.NextMonthButton ?? local.components?.Button ?? CalendarNavButton;
    const goToPreviousMonth = () => {
      const month = clampMonth(previousMonth());
      calendarProps.setMonth(month);
      local.onPrevClick?.(month);
    };
    const goToNextMonth = () => {
      const month = clampMonth(nextMonth());
      calendarProps.setMonth(month);
      local.onNextClick?.(month);
    };

    const renderPreviousButton = () => (
      <CalendarPrimitive.Nav
        as={PreviousButton()}
        action={previousAction()}
        data-animated-button={local.animate ? "true" : undefined}
        aria-label={
          local.labels?.labelPrevious?.(
            previousDisabled() ? undefined : previousMonth(),
            dateOptions(),
          ) ?? "Go to the previous month"
        }
        disabled={previousDisabled()}
        onClick={(event: MouseEvent) => {
          event.preventDefault();
          goToPreviousMonth();
        }}
        class={cn(
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          local.navLayout === "around" && "absolute top-0 left-0",
          slotClass("button_previous", ""),
        )}
        style={local.styles?.button_previous}
      >
        <Dynamic
          component={Chevron()}
          orientation="left"
          class={cn("size-4", slotClass("chevron", ""))}
          style={local.styles?.chevron}
        />
      </CalendarPrimitive.Nav>
    );
    const renderNextButton = () => (
      <CalendarPrimitive.Nav
        as={NextButton()}
        action={nextAction()}
        data-animated-button={local.animate ? "true" : undefined}
        aria-label={
          local.labels?.labelNext?.(nextDisabled() ? undefined : nextMonth(), dateOptions()) ??
          "Go to the next month"
        }
        disabled={nextDisabled()}
        onClick={(event: MouseEvent) => {
          event.preventDefault();
          goToNextMonth();
        }}
        class={cn(
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          local.navLayout === "around" && "absolute top-0 right-0",
          slotClass("button_next", ""),
        )}
        style={local.styles?.button_next}
      >
        <Dynamic
          component={Chevron()}
          orientation="right"
          class={cn("size-4", slotClass("chevron", ""))}
          style={local.styles?.chevron}
        />
      </CalendarPrimitive.Nav>
    );
    const renderNavigation = () => (
      <Dynamic
        component={local.components?.Nav ?? CalendarNavSlot}
        data-animated-nav={local.animate ? "true" : undefined}
        aria-label={local.labels?.labelNav?.(dateOptions()) ?? "Calendar navigation"}
        nextMonth={nextDisabled() ? undefined : nextMonth()}
        onNextClick={(event: MouseEvent) => {
          event.preventDefault();
          goToNextMonth();
        }}
        onPreviousClick={(event: MouseEvent) => {
          event.preventDefault();
          goToPreviousMonth();
        }}
        previousMonth={previousDisabled() ? undefined : previousMonth()}
        class={cn(
          "absolute inset-x-0 top-0 flex w-full items-center gap-1",
          local.navLayout === "after" ? "justify-end" : "justify-between",
          slotClass("nav", ""),
        )}
        style={local.styles?.nav}
      >
        {renderPreviousButton()}
        {renderNextButton()}
      </Dynamic>
    );
    const weeksForMonth = (month: { month: Date; weeks: Date[][] }) =>
      local.broadcastCalendar ? getBroadcastWeeks(month.month) : month.weeks;
    const visibleMonthBounds = createMemo(() => {
      const months = displayedMonths().map(({ month }) => month.month);
      const firstMonth = months.reduce(
        (first, month) => (monthTimestamp(month) < monthTimestamp(first) ? month : first),
        calendarProps.month,
      );
      const lastMonth = months.reduce(
        (last, month) => (monthTimestamp(month) > monthTimestamp(last) ? month : last),
        calendarProps.month,
      );
      return {
        end: makeCalendarDate(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
        start: makeCalendarDate(firstMonth.getFullYear(), firstMonth.getMonth()),
      };
    });
    const weekNumberFor = (days: Date[]) => {
      const firstDay = days[0];
      if (!firstDay) return 0;
      if (local.ISOWeek) return getISOWeek(firstDay);
      return getWeek(firstDay, {
        firstWeekContainsDate: local.firstWeekContainsDate,
        locale: local.locale as Locale | undefined,
        weekStartsOn: weekStartsOn(),
      });
    };
    const calendarWeekFor = (days: Date[], displayMonth: Date): CalendarWeek => ({
      days: days.map((day) => createCalendarDay(day, displayMonth)),
      weekNumber: weekNumberFor(days),
    });
    const calendarMonthFor = (month: { month: Date; weeks: Date[][] }): CalendarMonth => ({
      date: month.month,
      weeks: weeksForMonth(month).map((week) => calendarWeekFor(week, month.month)),
    });

    let previousSnapshot: HTMLElement | undefined;
    let animationCleanup: (() => void) | undefined;
    let animationTimer: ReturnType<typeof setTimeout> | undefined;
    const animationClasses = {
      captionAfterEnter: () => slotClass("caption_after_enter", "z-calendar-caption-after-enter"),
      captionAfterExit: () => slotClass("caption_after_exit", "z-calendar-caption-after-exit"),
      captionBeforeEnter: () =>
        slotClass("caption_before_enter", "z-calendar-caption-before-enter"),
      captionBeforeExit: () => slotClass("caption_before_exit", "z-calendar-caption-before-exit"),
      weeksAfterEnter: () => slotClass("weeks_after_enter", "z-calendar-weeks-after-enter"),
      weeksAfterExit: () => slotClass("weeks_after_exit", "z-calendar-weeks-after-exit"),
      weeksBeforeEnter: () => slotClass("weeks_before_enter", "z-calendar-weeks-before-enter"),
      weeksBeforeExit: () => slotClass("weeks_before_exit", "z-calendar-weeks-before-exit"),
    };
    const classTokens = (className: string) => className.split(/\s+/).filter(Boolean);
    const addAnimationClass = (element: Element | null, className: string) =>
      element?.classList.add(...classTokens(className));
    const removeAnimationClass = (element: Element | null, className: string) =>
      element?.classList.remove(...classTokens(className));

    createEffect(
      on(
        () => monthTimestamp(calendarProps.month),
        (nextMonthTimestamp, previousMonthTimestamp) => {
          queueMicrotask(() => {
            const root = rootElement;
            if (!root) return;
            animationCleanup?.();

            const nextSnapshot = root.cloneNode(true);
            if (!(nextSnapshot instanceof HTMLElement)) return;
            for (const snapshot of nextSnapshot.querySelectorAll(
              "[data-calendar-animation-snapshot]",
            )) {
              snapshot.remove();
            }
            for (const element of nextSnapshot.querySelectorAll("[id]")) {
              element.removeAttribute("id");
            }

            const oldSnapshot = previousSnapshot;
            previousSnapshot = nextSnapshot;
            if (
              !local.animate ||
              previousMonthTimestamp === undefined ||
              previousMonthTimestamp === nextMonthTimestamp ||
              !oldSnapshot ||
              focusedDay() !== undefined
            ) {
              return;
            }

            const movingAfter = nextMonthTimestamp > previousMonthTimestamp;
            const currentMonths = Array.from(
              root.querySelectorAll<HTMLElement>("[data-animated-month]"),
            );
            const previousMonths = Array.from(
              oldSnapshot.querySelectorAll<HTMLElement>("[data-animated-month]"),
            );
            if (currentMonths.length !== previousMonths.length) return;

            root.style.isolation = "isolate";
            const nav = root.querySelector<HTMLElement>("[data-animated-nav]");
            if (nav) nav.style.zIndex = "1";
            const cleanups: (() => void)[] = [];

            currentMonths.forEach((currentMonth, index) => {
              const previousMonth = previousMonths[index];
              if (!previousMonth) return;
              const currentCaption = currentMonth.querySelector("[data-animated-caption]");
              const currentWeeks = currentMonth.querySelector("[data-animated-weeks]");
              const previousCaption = previousMonth.querySelector("[data-animated-caption]");
              const previousWeeks = previousMonth.querySelector("[data-animated-weeks]");
              const currentCaptionClass = movingAfter
                ? animationClasses.captionAfterEnter()
                : animationClasses.captionBeforeEnter();
              const currentWeeksClass = movingAfter
                ? animationClasses.weeksAfterEnter()
                : animationClasses.weeksBeforeEnter();
              const previousCaptionClass = movingAfter
                ? animationClasses.captionBeforeExit()
                : animationClasses.captionAfterExit();
              const previousWeeksClass = movingAfter
                ? animationClasses.weeksBeforeExit()
                : animationClasses.weeksAfterExit();

              currentMonth.style.position = "relative";
              currentMonth.style.overflow = "hidden";
              addAnimationClass(currentCaption, currentCaptionClass);
              addAnimationClass(currentWeeks, currentWeeksClass);
              previousMonth.dataset.calendarAnimationSnapshot = "true";
              previousMonth.setAttribute("aria-hidden", "true");
              previousMonth.style.pointerEvents = "none";
              previousMonth.style.position = "absolute";
              previousMonth.style.inset = "0";
              previousMonth.style.overflow = "hidden";
              const previousWeekdays = previousMonth.querySelector<HTMLElement>(
                "[data-animated-weekdays]",
              );
              if (previousWeekdays) previousWeekdays.style.opacity = "0";
              addAnimationClass(previousCaption, previousCaptionClass);
              addAnimationClass(previousWeeks, previousWeeksClass);
              currentMonth.insertBefore(previousMonth, currentMonth.firstChild);

              cleanups.push(() => {
                removeAnimationClass(currentCaption, currentCaptionClass);
                removeAnimationClass(currentWeeks, currentWeeksClass);
                currentMonth.style.position = "";
                currentMonth.style.overflow = "";
                previousMonth.remove();
              });
            });

            animationCleanup = () => {
              if (animationTimer !== undefined) clearTimeout(animationTimer);
              for (const cleanup of cleanups) cleanup();
              root.style.isolation = "";
              if (nav) nav.style.zIndex = "";
              animationCleanup = undefined;
              animationTimer = undefined;
            };
            const durationValue = getComputedStyle(root)
              .getPropertyValue("--rdp-animation_duration")
              .trim();
            const duration = durationValue.endsWith("ms")
              ? Number.parseFloat(durationValue)
              : Number.parseFloat(durationValue || "0.3") * 1000;
            const animatedElement = root.querySelector<HTMLElement>(
              ".z-calendar-caption-after-enter, .z-calendar-caption-before-enter",
            );
            animatedElement?.addEventListener("animationend", () => animationCleanup?.(), {
              once: true,
            });
            animationTimer = setTimeout(() => animationCleanup?.(), duration + 50);
          });
        },
      ),
    );
    onCleanup(() => animationCleanup?.());

    return (
      <Dynamic
        component={Root()}
        rootRef={setRootRef}
        data-slot="calendar"
        data-animate={local.animate || undefined}
        data-broadcast-calendar={local.broadcastCalendar || undefined}
        data-mode={mode()}
        data-multiple-months={numberOfMonths() > 1 || undefined}
        data-nav-layout={local.navLayout}
        data-required={local.required}
        data-week-numbers={showWeekNumber() || undefined}
        class={cn(
          "group/calendar z-calendar w-fit bg-background in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
          slotClass("root", ""),
          local.class,
        )}
        style={local.styles?.root}
        {...others}
      >
        <Dynamic
          component={local.components?.Months ?? "div"}
          class={cn("relative flex flex-col gap-4 md:flex-row", slotClass("months", ""))}
          style={local.styles?.months}
        >
          <Show when={!local.hideNavigation && local.navLayout === undefined}>
            {renderNavigation()}
          </Show>

          <For each={displayedMonths()}>
            {(monthEntry, displayIndex) => {
              const calendarMonth = () => calendarMonthFor(monthEntry.month);
              const MonthCaption: Component<ComponentProps<"div">> = (props) => (
                <Dynamic
                  component={local.components?.MonthCaption ?? CalendarMonthSlot}
                  calendarMonth={calendarMonth()}
                  displayIndex={displayIndex()}
                  {...props}
                />
              );
              return (
                <Dynamic
                  component={local.components?.Month ?? CalendarMonthSlot}
                  calendarMonth={calendarMonth()}
                  data-animated-month={local.animate ? "true" : undefined}
                  displayIndex={displayIndex()}
                  class={cn("flex w-full flex-col gap-4", slotClass("month", ""))}
                  style={local.styles?.month}
                >
                  <Show
                    when={
                      !local.hideNavigation && local.navLayout === "around" && displayIndex() === 0
                    }
                  >
                    {renderPreviousButton()}
                  </Show>
                  <CalendarPrimitive.Label
                    as={MonthCaption}
                    data-animated-caption={local.animate ? "true" : undefined}
                    index={monthEntry.index}
                    class={cn(
                      "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
                      slotClass("month_caption", ""),
                    )}
                    style={local.styles?.month_caption}
                  >
                    {renderCaption(monthEntry.month.month, (month) =>
                      calendarProps.setMonth(
                        clampMonth(
                          makeCalendarDate(
                            month.getFullYear(),
                            month.getMonth() - monthEntry.index,
                          ),
                        ),
                      ),
                    )}
                  </CalendarPrimitive.Label>
                  <Show
                    when={
                      !local.hideNavigation &&
                      local.navLayout === "around" &&
                      displayIndex() === displayedMonths().length - 1
                    }
                  >
                    {renderNextButton()}
                  </Show>
                  <Show
                    when={
                      !local.hideNavigation &&
                      local.navLayout === "after" &&
                      displayIndex() === displayedMonths().length - 1
                    }
                  >
                    {renderNavigation()}
                  </Show>

                  <CalendarPrimitive.Table
                    as={local.components?.MonthGrid ?? "table"}
                    index={monthEntry.index}
                    aria-label={
                      local.labels?.labelGrid?.(
                        monthEntry.month.month,
                        dateOptions(),
                        local.dateLib,
                      ) ?? formatCaption(monthEntry.month.month)
                    }
                    aria-multiselectable={
                      mode() === "multiple" || mode() === "range" ? "true" : undefined
                    }
                    class={cn("w-full border-collapse", slotClass("month_grid", ""))}
                    style={local.styles?.month_grid}
                  >
                    <Show when={!local.hideWeekdays}>
                      <thead>
                        <Dynamic
                          component={local.components?.Weekdays ?? "tr"}
                          data-animated-weekdays={local.animate ? "true" : undefined}
                          class={cn("flex", slotClass("weekdays", ""))}
                          style={local.styles?.weekdays}
                        >
                          <Show when={showWeekNumber()}>
                            <Dynamic
                              component={local.components?.WeekNumberHeader ?? "th"}
                              aria-label={
                                local.labels?.labelWeekNumberHeader?.(dateOptions()) ??
                                "Week number"
                              }
                              scope="col"
                              class={cn(
                                "w-(--cell-size) select-none",
                                slotClass("week_number_header", ""),
                              )}
                              style={local.styles?.week_number_header}
                            >
                              {local.formatters?.formatWeekNumberHeader?.(dateOptions())}
                            </Dynamic>
                          </Show>
                          <Index each={calendarProps.weekdays}>
                            {(weekday) => (
                              <CalendarPrimitive.HeadCell
                                as={local.components?.Weekday ?? "th"}
                                abbr={weekday().toLocaleDateString(local.locale?.code, {
                                  weekday: "long",
                                })}
                                aria-label={local.labels?.labelWeekday?.(
                                  weekday(),
                                  dateOptions(),
                                  local.dateLib,
                                )}
                                class={cn(
                                  "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
                                  slotClass("weekday", ""),
                                )}
                                style={local.styles?.weekday}
                              >
                                {formatWeekday(weekday())}
                              </CalendarPrimitive.HeadCell>
                            )}
                          </Index>
                        </Dynamic>
                      </thead>
                    </Show>
                    <Dynamic
                      component={local.components?.Weeks ?? "tbody"}
                      data-animated-weeks={local.animate ? "true" : undefined}
                      class={slotClass("weeks", "")}
                      style={local.styles?.weeks}
                    >
                      <Index each={weeksForMonth(monthEntry.month)}>
                        {(week) => {
                          const calendarWeek = () =>
                            calendarWeekFor(week(), monthEntry.month.month);
                          return (
                            <Dynamic
                              component={local.components?.Week ?? CalendarWeekSlot}
                              class={cn("mt-2 flex w-full", slotClass("week", ""))}
                              style={local.styles?.week}
                              week={calendarWeek()}
                            >
                              <Show when={showWeekNumber()}>
                                <Dynamic
                                  component={WeekNumber()}
                                  week={calendarWeek()}
                                  weekNumber={calendarWeek().weekNumber}
                                  aria-label={
                                    local.labels?.labelWeekNumber?.(
                                      calendarWeek().weekNumber,
                                      dateOptions(),
                                    ) ?? `Week ${calendarWeek().weekNumber}`
                                  }
                                  role="rowheader"
                                  scope="row"
                                  class={cn(
                                    "text-[0.8rem] text-muted-foreground select-none",
                                    slotClass("week_number", ""),
                                  )}
                                  style={local.styles?.week_number}
                                >
                                  {local.formatters?.formatWeekNumber?.(
                                    calendarWeek().weekNumber,
                                    dateOptions(),
                                  ) ?? formatNumber(calendarWeek().weekNumber)}
                                </Dynamic>
                              </Show>
                              <Index each={week()}>
                                {(day) => (
                                  <CalendarDayCell
                                    classNames={local.classNames}
                                    components={local.components}
                                    dateLib={local.dateLib}
                                    dateOptions={dateOptions()}
                                    day={day()}
                                    disabled={isDisabled}
                                    disableNavigation={local.disableNavigation ?? false}
                                    focusedDay={focusedDay()}
                                    formatters={local.formatters}
                                    hidden={local.hidden}
                                    interactive={
                                      mode() !== undefined || local.onDayClick !== undefined
                                    }
                                    labels={local.labels}
                                    locale={local.locale}
                                    modifiers={local.modifiers}
                                    modifiersClassNames={local.modifiersClassNames}
                                    modifiersStyles={local.modifiersStyles}
                                    month={monthEntry.month.month}
                                    numerals={local.numerals}
                                    onDayBlur={handleDayBlur}
                                    onDayClick={local.onDayClick}
                                    onDayFocus={handleDayFocus}
                                    onDayKeyDown={local.onDayKeyDown}
                                    onDayMouseEnter={local.onDayMouseEnter}
                                    onDayMouseLeave={local.onDayMouseLeave}
                                    onDaySelect={(day, modifiers, event) => {
                                      calendarProps.setFocusedDay(day);
                                      setFocusedDay(day);
                                      selectDay(day, modifiers, event);
                                      return true;
                                    }}
                                    showOutsideDays={showOutsideDays()}
                                    showWeekNumber={showWeekNumber()}
                                    styles={local.styles}
                                    textDirection={props.dir === "rtl" ? "rtl" : "ltr"}
                                    timeZone={local.timeZone}
                                    today={today()}
                                    value={visibleValue()}
                                    visibleEndDay={visibleMonthBounds().end}
                                    visibleStartDay={visibleMonthBounds().start}
                                    weekStartsOn={weekStartsOn()}
                                  />
                                )}
                              </Index>
                            </Dynamic>
                          );
                        }}
                      </Index>
                    </Dynamic>
                  </CalendarPrimitive.Table>
                </Dynamic>
              );
            }}
          </For>
        </Dynamic>
        <Show when={local.footer}>
          <Dynamic
            component={local.components?.Footer ?? "footer"}
            aria-live="polite"
            role="status"
            class={slotClass("footer", "")}
            style={local.styles?.footer}
          >
            {local.footer}
          </Dynamic>
        </Show>
      </Dynamic>
    );
  };

  const primitiveBaseProps = () => ({
    month: local.month ? clampMonth(normalizeCalendarDate(local.month)) : undefined,
    onMonthChange: (month: Date) => local.onMonthChange?.(clampMonth(month)),
    initialMonth: clampMonth(normalizeCalendarDate(local.defaultMonth ?? local.month ?? today())),
    initialFocusedDay: initialFocusedDay(),
    numberOfMonths: numberOfMonths(),
    fixedWeeks: local.fixedWeeks ?? false,
    disableOutsideDays: !showOutsideDays(),
    disabled: isDisabled,
    startOfWeek: weekStartsOn(),
    textDirection: props.dir === "rtl" ? ("rtl" as const) : ("ltr" as const),
  });

  return (
    <Switch
      fallback={
        <CalendarPrimitive
          mode="single"
          value={null}
          onValueChange={() => undefined}
          {...primitiveBaseProps()}
        >
          {renderCalendar}
        </CalendarPrimitive>
      }
    >
      <Match when={mode() === "multiple"}>
        <CalendarPrimitive
          mode="multiple"
          value={multipleValue()}
          onValueChange={() => undefined}
          {...primitiveBaseProps()}
          required={local.required ?? false}
          min={local.min ?? null}
          max={local.max ?? null}
        >
          {renderCalendar}
        </CalendarPrimitive>
      </Match>
      <Match when={mode() === "range"}>
        <CalendarPrimitive
          mode="range"
          value={rangeValue()}
          onValueChange={() => undefined}
          {...primitiveBaseProps()}
          required={local.required ?? false}
          excludeDisabled={local.excludeDisabled ?? false}
        >
          {renderCalendar}
        </CalendarPrimitive>
      </Match>
      <Match when={mode() === "single"}>
        <CalendarPrimitive
          mode="single"
          value={singleValue()}
          onValueChange={() => undefined}
          {...primitiveBaseProps()}
          required={local.required ?? false}
        >
          {renderCalendar}
        </CalendarPrimitive>
      </Match>
    </Switch>
  );
};

export {
  Calendar,
  type CalendarComponents,
  type CalendarDay,
  CalendarDayButton,
  type CalendarDayButtonProps,
  type CalendarDayModifiers,
  type CalendarFormatters,
  type CalendarLabels,
  type CalendarMatcher,
  type CalendarProps,
  type CalendarRangeValue,
  type CalendarValue,
};
