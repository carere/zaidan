import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-solid";
import type { ComponentProps, JSX } from "solid-js";
import { createSignal, For, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import { Calendar } from "@/registry/kobalte/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/kobalte/ui/tooltip";
import {
  useEventCalendarNavigation,
  useEventCalendarSettings,
  useEventCalendarView,
  useEventCalendarViewConfig,
} from "./event-calendar";
import { toZoned } from "./event-calendar-lib";
import type { CalendarView } from "./event-calendar-types";

/** Configured nav button variant/size (viewConfig.navButtonVariant/Size)
 *  plus the shared classNames.navButton hook, merged on every nav button. */
function useNavButtonProps(): {
  variant: "ghost" | "outline" | "secondary" | "default";
  size: "sm" | "default";
  iconSize: "icon-sm" | "icon";
  class: string | undefined;
} {
  const viewConfig = useEventCalendarViewConfig();
  return {
    get variant() {
      return viewConfig.navButtonVariant;
    },
    get size() {
      return viewConfig.navButtonSize;
    },
    get iconSize() {
      return viewConfig.navButtonSize === "sm" ? ("icon-sm" as const) : ("icon" as const);
    },
    get class() {
      return viewConfig.classNames?.navButton;
    },
  };
}

/** Resolved nav tooltip policy (viewConfig.navTooltips + classNames.navTooltip). */
function useNavTooltipConfig(): {
  disabled: boolean;
  side: "top" | "bottom" | "left" | "right";
  delay: number;
  closeDelay: number;
  timeout: number;
  class: string | undefined;
} {
  const viewConfig = useEventCalendarViewConfig();
  const config = () => (viewConfig.navTooltips === false ? undefined : viewConfig.navTooltips);
  return {
    get disabled() {
      return viewConfig.navTooltips === false;
    },
    // the nav sits at the top of the calendar, so tooltips open upward by
    // default (away from the grid); collision flipping still drops them below
    // when there is no room above
    get side() {
      return config()?.side ?? "top";
    },
    get delay() {
      return config()?.delay ?? 600;
    },
    get closeDelay() {
      return config()?.closeDelay ?? 0;
    },
    get timeout() {
      return config()?.timeout ?? 300;
    },
    get class() {
      return viewConfig.classNames?.navTooltip;
    },
  };
}

type NavButtonProps = Omit<ComponentProps<"button">, "children"> & {
  children?: JSX.Element;
  /**
   * Tooltip policy (the part that usually goes wrong on clickable elements):
   * tooltips appear ONLY on hover or keyboard focus-visible - a pointer click
   * never re-triggers them. Buttons that open overlays (the view switcher)
   * use a hover-only tooltip that is force-closed while the overlay is up and
   * ignores focus, so nothing flashes when focus returns after selection.
   * Icon-only buttons default to their accessible label; Today defaults to
   * the actual current date (info the label doesn't carry). Pass null to
   * disable one, or any node to override; viewConfig.navTooltips=false turns
   * them all off (its object form tunes side/delay/closeDelay/timeout).
   */
  tooltip?: JSX.Element | null;
};

/**
 * Shared nav button shell: configured variant/size, the classNames.navButton
 * hook, and the hover/focus-visible tooltip wrapper. Renders the bare button
 * when the tooltip is disabled (per-button tooltip=null or
 * viewConfig.navTooltips=false).
 */
function NavButton(
  props: NavButtonProps & {
    dataSlot: string;
    /** Used when the consumer passes no explicit `tooltip`. */
    defaultTooltip?: JSX.Element;
    /** Icon-only button: follows the configured icon size. */
    icon?: boolean;
  },
) {
  const nav = useNavButtonProps();
  const tooltips = useNavTooltipConfig();
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "dataSlot",
    "defaultTooltip",
    "disabled",
    "icon",
    "tooltip",
  ]);
  const tooltip = () => (local.tooltip === undefined ? local.defaultTooltip : local.tooltip);
  const enabled = () => !tooltips.disabled && tooltip() !== null && tooltip() !== undefined;

  const NavButtonTarget = (targetProps: ComponentProps<"button">) => (
    <Button
      {...targetProps}
      variant={nav.variant}
      size={local.icon ? nav.iconSize : nav.size}
      disabled={local.disabled}
      data-slot={local.dataSlot}
      class={cn(nav.class, local.class)}
    >
      {local.children}
    </Button>
  );

  return (
    <Show when={enabled()} fallback={<NavButtonTarget {...others} />}>
      <Tooltip>
        <TooltipTrigger as={NavButtonTarget} disabled={local.disabled} {...others} />
        <TooltipContent side={tooltips.side} class={tooltips.class}>
          {tooltip()}
        </TooltipContent>
      </Tooltip>
    </Show>
  );
}

function EventCalendarNavToday(props: NavButtonProps) {
  const navigation = useEventCalendarNavigation();
  const settings = useEventCalendarSettings();
  const [local, others] = splitProps(props, ["children"]);
  // display-zone "today", like every other today derivation in the calendar
  // (a system-zone new Date() can name a different day than Today opens)
  const defaultTooltip = () =>
    format(toZoned(new Date(), settings.timeZone), settings.i18n.formats.dayTitle, {
      locale: settings.locale,
    });
  return (
    <NavButton
      dataSlot="event-calendar-nav-today"
      defaultTooltip={defaultTooltip()}
      data-active={navigation.isToday || undefined}
      onClick={() => navigation.today()}
      {...others}
    >
      {local.children ?? settings.i18n.labels.today}
    </NavButton>
  );
}

function EventCalendarNavPrev(props: NavButtonProps) {
  const navigation = useEventCalendarNavigation();
  const settings = useEventCalendarSettings();
  const [local, others] = splitProps(props, ["children"]);
  return (
    <NavButton
      icon
      dataSlot="event-calendar-nav-prev"
      defaultTooltip={settings.i18n.labels.previous}
      aria-label={settings.i18n.labels.previous}
      onClick={() => navigation.prev()}
      {...others}
    >
      {local.children ?? <ChevronLeft class="size-4" aria-hidden="true" />}
    </NavButton>
  );
}

function EventCalendarNavNext(props: NavButtonProps) {
  const navigation = useEventCalendarNavigation();
  const settings = useEventCalendarSettings();
  const [local, others] = splitProps(props, ["children"]);
  return (
    <NavButton
      icon
      dataSlot="event-calendar-nav-next"
      defaultTooltip={settings.i18n.labels.next}
      aria-label={settings.i18n.labels.next}
      onClick={() => navigation.next()}
      {...others}
    >
      {local.children ?? <ChevronRight class="size-4" aria-hidden="true" />}
    </NavButton>
  );
}

interface EventCalendarTitleProps extends ComponentProps<"div"> {
  format?: (ctx: { title: string }) => JSX.Element;
}

function EventCalendarTitle(props: EventCalendarTitleProps) {
  const navigation = useEventCalendarNavigation();
  const viewConfig = useEventCalendarViewConfig();
  const [local, others] = splitProps(props, ["children", "class", "format"]);
  return (
    <div
      data-slot="event-calendar-title"
      aria-live="polite"
      class={cn(
        "min-w-0 truncate text-sm font-semibold",
        viewConfig.classNames?.title,
        local.class,
      )}
      {...others}
    >
      {local.children ?? local.format?.({ title: navigation.title }) ?? navigation.title}
    </div>
  );
}

interface EventCalendarViewSwitcherProps extends Omit<ComponentProps<"button">, "children"> {
  children?: JSX.Element;
  /** Hover/focus-visible hint; defaults to the "Select view" label. Pass
   *  null to disable (overlay-opener policy). */
  tooltip?: JSX.Element | null;
}

function EventCalendarViewSwitcher(props: EventCalendarViewSwitcherProps) {
  const view = useEventCalendarView();
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const nav = useNavButtonProps();
  const tooltips = useNavTooltipConfig();
  const [local, others] = splitProps(props, ["children", "class", "disabled", "tooltip"]);
  // Controlled open: selecting a view swaps the whole content subtree in the
  // same click, so closing must not depend on the menu's internal handler.
  const [open, setOpen] = createSignal(false);
  // Hover-only tooltip: when the menu closes, focus returns to the trigger and
  // a focus-opened tooltip would flash - ignore focus opens.
  const [tipOpen, setTipOpen] = createSignal(false);

  const selectView = (v: CalendarView, opts?: { dayCount?: number }) => {
    setOpen(false);
    view.setView(v, opts);
  };

  const viewLabel = (v: CalendarView) =>
    v === "days" ? settings.i18n.viewNames.days(view.dayCount) : settings.i18n.viewNames[v];

  const SwitcherButton = (targetProps: ComponentProps<"button">) => (
    <Button
      {...targetProps}
      variant={nav.variant}
      size={nav.size}
      disabled={local.disabled}
      data-slot="event-calendar-view-switcher"
      aria-label={settings.i18n.labels.selectView}
    >
      {local.children ?? (
        <>
          {viewLabel(view.view)}
          <ChevronDown class="size-4 opacity-60" aria-hidden="true" />
        </>
      )}
    </Button>
  );

  // Menu trigger INSIDE the tooltip trigger, not the other way round: the menu
  // trigger hands its props down as lazy getters, and reading those from inside
  // a foreign component leaves an undisposed memo behind on every open.
  const SwitcherTrigger = (triggerProps: ComponentProps<"button">) => (
    <DropdownMenuTrigger
      as={SwitcherButton}
      class={cn("gap-1", nav.class, local.class)}
      {...triggerProps}
    />
  );

  return (
    <DropdownMenu
      open={open()}
      onOpenChange={(next: boolean) => {
        setOpen(next);
        if (next) setTipOpen(false);
      }}
      placement="bottom-start"
    >
      <Tooltip
        open={tipOpen() && !open()}
        onOpenChange={(next, details) => {
          // opens are hover-only; the trigger-focus open that follows a
          // menu close is ignored, closes always land
          if (next && details.reason !== "trigger-hover") return;
          setTipOpen(next);
        }}
      >
        {/* Tooltip on an overlay-opener: hover-only (focus opens ignored) and
            force-closed while the menu is up, so it never lingers or flashes
            when focus returns on close. Inherits the nav TooltipProvider's
            delay/closeDelay/timeout. */}
        <TooltipTrigger as={SwitcherTrigger} disabled={local.disabled} {...others} />
        <Show when={tipOpen() && !open() && local.tooltip !== null && !tooltips.disabled}>
          <TooltipContent side={tooltips.side} class={tooltips.class}>
            {local.tooltip ?? settings.i18n.labels.selectView}
          </TooltipContent>
        </Show>
      </Tooltip>
      <DropdownMenuContent class={cn("min-w-44", viewConfig.classNames?.viewSwitcherContent)}>
        {/* GroupLabel must live inside a Group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel
            class={cn(
              "text-muted-foreground font-normal",
              viewConfig.classNames?.viewSwitcherLabel,
            )}
          >
            {settings.i18n.labels.selectView}
          </DropdownMenuLabel>
          <For each={view.availableViews}>
            {(v) => (
              <Show
                when={v === "days"}
                fallback={
                  <DropdownMenuItem
                    data-active={view.view === v || undefined}
                    onSelect={() => selectView(v)}
                  >
                    {viewLabel(v)}
                    <Show when={viewConfig.enableShortcuts}>
                      <EventCalendarViewShortcut>
                        {settings.i18n.labels.viewShortcuts[v]}
                      </EventCalendarViewShortcut>
                    </Show>
                  </DropdownMenuItem>
                }
              >
                <For each={viewConfig.dayCountPresets}>
                  {(count) => (
                    <DropdownMenuItem
                      data-active={(view.view === "days" && view.dayCount === count) || undefined}
                      onSelect={() => selectView("days", { dayCount: count })}
                    >
                      {settings.i18n.viewNames.days(count)}
                      {/* hint derived from the preset itself, not i18n's default */}
                      <Show when={viewConfig.enableShortcuts}>
                        <EventCalendarViewShortcut>{count}</EventCalendarViewShortcut>
                      </Show>
                    </DropdownMenuItem>
                  )}
                </For>
              </Show>
            )}
          </For>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Outline key badge; theme-token only, so it adapts to every style. */
function EventCalendarViewShortcut(props: { children?: JSX.Element }) {
  const viewConfig = useEventCalendarViewConfig();
  return (
    <kbd
      data-slot="event-calendar-view-shortcut"
      class={cn(
        "text-muted-foreground ms-auto inline-flex size-5 shrink-0 items-center justify-center rounded-sm border font-sans text-xs",
        viewConfig.classNames?.viewShortcut,
      )}
    >
      {props.children}
    </kbd>
  );
}

interface EventCalendarDatePickerProps extends Omit<ComponentProps<"button">, "children"> {
  children?: JSX.Element;
  /** "auto" (default) resolves per view: range for week/N-days/agenda. */
  mode?: "auto" | "single" | "range";
  /** Hover/focus-visible hint; defaults to null - no tooltip, because the
   *  button opens an overlay (see the NavButtonProps tooltip policy). */
  tooltip?: JSX.Element | null;
}

/** Views whose period reads better as a highlighted range. */
const RANGE_VIEWS: CalendarView[] = ["week", "days", "agenda"];

/**
 * Optional go-to-date picker (the Zaidan Calendar in a popover), view-aware:
 * week/N-days/agenda highlight the whole active range (any click re-anchors
 * the period), other views select a single date. Not part of the default
 * nav - compose it yourself (or any external picker driving
 * useEventCalendarNavigation().goTo). No tooltip by default: it opens an
 * overlay (see the NavButtonProps tooltip policy); pass `tooltip` to opt in.
 */
function EventCalendarDatePicker(props: EventCalendarDatePickerProps) {
  const navigation = useEventCalendarNavigation();
  const view = useEventCalendarView();
  const settings = useEventCalendarSettings();
  const viewConfig = useEventCalendarViewConfig();
  const nav = useNavButtonProps();
  const tooltips = useNavTooltipConfig();
  const [local, others] = splitProps(props, ["children", "class", "mode", "tooltip"]);
  const [open, setOpen] = createSignal(false);
  const zoned = () => toZoned(navigation.date, settings.timeZone);

  const resolved = () => {
    const configured = local.mode ?? "auto";
    if (configured !== "auto") return configured;
    return RANGE_VIEWS.includes(view.view) ? "range" : "single";
  };

  const tooltip = () => (local.tooltip === undefined ? null : local.tooltip);
  const tooltipEnabled = () => !tooltips.disabled && tooltip() !== null && tooltip() !== undefined;

  const pick = (next: Date | undefined) => {
    if (!next) return;
    navigation.goTo(next);
    setOpen(false);
  };

  const DatePickerButton = (targetProps: ComponentProps<"button">) => (
    <Button
      {...targetProps}
      variant={nav.variant}
      size={nav.iconSize}
      data-slot="event-calendar-date-picker"
      data-mode={resolved()}
      aria-label={settings.i18n.labels.goToDate}
      class={cn(nav.class, local.class)}
    >
      {local.children ?? <CalendarIcon class="size-4" aria-hidden="true" />}
    </Button>
  );

  // Popover trigger inside the tooltip trigger, same ownership reason as the
  // view switcher above.
  const DatePickerTrigger = (triggerProps: ComponentProps<"button">) => (
    <PopoverTrigger as={DatePickerButton} {...triggerProps} />
  );

  return (
    <Popover open={open()} onOpenChange={setOpen} placement="bottom-start">
      <Show when={tooltipEnabled()} fallback={<PopoverTrigger as={DatePickerButton} {...others} />}>
        <Tooltip>
          <TooltipTrigger as={DatePickerTrigger} {...others} />
          <TooltipContent side={tooltips.side} class={tooltips.class}>
            {tooltip()}
          </TooltipContent>
        </Tooltip>
      </Show>
      <PopoverContent class={cn("w-auto p-0!", viewConfig.classNames?.datePickerContent)}>
        <Show
          when={resolved() === "range"}
          fallback={
            <Calendar
              mode="single"
              selected={zoned()}
              defaultMonth={zoned()}
              onSelect={pick}
              locale={settings.locale}
              weekStartsOn={settings.weekStartsOn}
            />
          }
        >
          <Calendar
            mode="range"
            selected={{
              from: toZoned(navigation.activeRange.start, settings.timeZone),
              to: toZoned(addDays(navigation.activeRange.end, -1), settings.timeZone),
            }}
            defaultMonth={zoned()}
            onDayClick={pick}
            locale={settings.locale}
            weekStartsOn={settings.weekStartsOn}
          />
        </Show>
      </PopoverContent>
    </Popover>
  );
}

type EventCalendarToolbarProps = ComponentProps<"div">;

/** Free slot for consumer toolbar buttons; pure layout shell. */
function EventCalendarToolbar(props: EventCalendarToolbarProps) {
  const viewConfig = useEventCalendarViewConfig();
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="event-calendar-toolbar"
      class={cn("flex items-center gap-2", viewConfig.classNames?.toolbar, local.class)}
      {...others}
    />
  );
}

interface EventCalendarNavProps extends ComponentProps<"div"> {
  /**
   * Render the view switcher in the composed layout. Turn off when the
   * calendar ships with a fixed view (e.g. a month-only embed) and users
   * should not be able to change it.
   * @default true
   */
  showViewSwitcher?: boolean;
}

/**
 * Default composed nav: Today, prev/next, title, spacer, view switcher.
 * Pass children to use it as a pure layout shell instead.
 */
function EventCalendarNav(props: EventCalendarNavProps) {
  const viewConfig = useEventCalendarViewConfig();
  const tooltips = useNavTooltipConfig();
  const [local, others] = splitProps(props, ["children", "class", "showViewSwitcher"]);
  const showViewSwitcher = () => local.showViewSwitcher ?? true;
  return (
    <div
      data-slot="event-calendar-nav"
      class={cn(
        "flex min-w-0 flex-wrap items-center gap-1 px-2 py-2",
        viewConfig.stickyNav && "bg-background sticky top-0 z-30",
        viewConfig.classNames?.nav,
        local.class,
      )}
      {...others}
    >
      {local.children ?? (
        // Shared provider: first tooltip waits, moving between buttons is instant
        <TooltipProvider
          delay={tooltips.delay}
          closeDelay={tooltips.closeDelay}
          timeout={tooltips.timeout}
        >
          <EventCalendarNavToday />
          <Show when={showViewSwitcher()}>
            <EventCalendarViewSwitcher />
          </Show>
          <div class="flex items-center">
            <EventCalendarNavPrev />
            <EventCalendarNavNext />
          </div>
          {/* ms-3 sets the title apart from the tight control cluster so the
              period reads as its own group, not another button */}
          <EventCalendarTitle class="ms-3" />
          <div class="grow" />
        </TooltipProvider>
      )}
    </div>
  );
}

export type {
  EventCalendarNavProps,
  EventCalendarTitleProps,
  EventCalendarToolbarProps,
  EventCalendarViewSwitcherProps,
};
export {
  EventCalendarDatePicker,
  EventCalendarNav,
  EventCalendarNavNext,
  EventCalendarNavPrev,
  EventCalendarNavToday,
  EventCalendarTitle,
  EventCalendarToolbar,
  EventCalendarViewSwitcher,
};
