import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-solid";
import type { ComponentProps, JSX } from "solid-js";
import { createMemo, createSignal, For, Show, splitProps } from "solid-js";
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
import { useGanttNavigation, useGanttScale, useGanttSettings, useGanttViewConfig } from "./gantt";
import { toZoned } from "./gantt-lib";
import type { GanttScale } from "./gantt-types";

const GANTT_SCALES: GanttScale[] = ["day", "week", "month", "quarter", "year"];

/**
 * The dropdown trigger rendered through a tooltip trigger into a Button. The
 * polymorphic generic cannot express the composed prop set, so the seam is
 * typed as a plain button here.
 */
const MenuTriggerButton = DropdownMenuTrigger as unknown as (
  props: Omit<ComponentProps<"button">, "as"> & {
    as: (triggerProps: ComponentProps<"button">) => JSX.Element;
  },
) => JSX.Element;

interface NavButtonStyle {
  variant: "ghost" | "outline" | "secondary" | "default";
  size: "sm" | "default";
  iconSize: "icon-sm" | "icon";
}

/** Configured nav button variant/size (viewConfig.navButtonVariant/Size). */
function useNavButtonProps(): () => NavButtonStyle {
  const viewConfig = useGanttViewConfig();
  return () => ({
    variant: viewConfig.navButtonVariant,
    size: viewConfig.navButtonSize,
    iconSize: viewConfig.navButtonSize === "sm" ? "icon-sm" : "icon",
  });
}

type NavButtonProps = Omit<ComponentProps<"button">, "children"> & {
  children?: JSX.Element;
  /**
   * Tooltip policy (the part that usually goes wrong on clickable elements):
   * tooltips appear ONLY on hover or keyboard focus-visible - a pointer click
   * never re-triggers them, and buttons that open overlays (the period
   * selector, consumer dialog buttons) get NO tooltip at all so nothing
   * flashes when focus returns. Icon-only buttons default to their accessible
   * label; Today defaults to the actual current date. Pass null to disable.
   */
  tooltip?: JSX.Element | null;
};

/**
 * Hover/focus-visible tooltip wrapper; renders the bare button when disabled.
 * `render` receives the trigger's own props (composed handlers, ref, ids) and
 * must spread them FIRST so the gantt's own `data-slot` and classes win.
 */
function NavTooltip(props: {
  content?: JSX.Element | null;
  /** Props that must reach the trigger element so the tooltip can compose them. */
  trigger?: ComponentProps<"button">;
  render: (triggerProps: ComponentProps<"button">) => JSX.Element;
}) {
  return (
    <Show
      when={props.content !== null && props.content !== undefined}
      fallback={props.render(props.trigger ?? {})}
    >
      <Tooltip>
        <TooltipTrigger
          as={(triggerProps: ComponentProps<"button">) => props.render(triggerProps)}
          {...(props.trigger ?? {})}
        />
        <TooltipContent side="bottom">{props.content}</TooltipContent>
      </Tooltip>
    </Show>
  );
}

function GanttNavToday(props: NavButtonProps) {
  const [local, others] = splitProps(props, ["class", "children", "tooltip"]);
  const nav = useGanttNavigation();
  const settings = useGanttSettings();
  const navStyle = useNavButtonProps();
  // zoned: a system-zone new Date() can name a different day than Today opens
  const defaultTooltip = () =>
    format(toZoned(new Date(), settings.timeZone), settings.i18n.formats.dayTitle, {
      locale: settings.locale,
    });
  return (
    <NavTooltip
      content={local.tooltip === undefined ? defaultTooltip() : local.tooltip}
      trigger={{ onClick: () => nav.today() }}
      render={(triggerProps) => (
        <Button
          {...triggerProps}
          variant={navStyle().variant}
          size={navStyle().size}
          data-slot="gantt-nav-today"
          data-active={nav.isToday() || undefined}
          class={cn(local.class)}
          {...others}
        >
          {local.children ?? settings.i18n.labels.today}
        </Button>
      )}
    />
  );
}

function GanttNavPrev(props: NavButtonProps) {
  const [local, others] = splitProps(props, ["class", "children", "tooltip"]);
  const nav = useGanttNavigation();
  const settings = useGanttSettings();
  const navStyle = useNavButtonProps();
  return (
    <NavTooltip
      content={local.tooltip === undefined ? settings.i18n.labels.previous : local.tooltip}
      trigger={{ onClick: () => nav.prev() }}
      render={(triggerProps) => (
        <Button
          {...triggerProps}
          variant={navStyle().variant}
          size={navStyle().iconSize}
          data-slot="gantt-nav-prev"
          aria-label={settings.i18n.labels.previous}
          class={cn(local.class)}
          {...others}
        >
          {local.children ?? <ChevronLeft class="size-4" aria-hidden="true" />}
        </Button>
      )}
    />
  );
}

function GanttNavNext(props: NavButtonProps) {
  const [local, others] = splitProps(props, ["class", "children", "tooltip"]);
  const nav = useGanttNavigation();
  const settings = useGanttSettings();
  const navStyle = useNavButtonProps();
  return (
    <NavTooltip
      content={local.tooltip === undefined ? settings.i18n.labels.next : local.tooltip}
      trigger={{ onClick: () => nav.next() }}
      render={(triggerProps) => (
        <Button
          {...triggerProps}
          variant={navStyle().variant}
          size={navStyle().iconSize}
          data-slot="gantt-nav-next"
          aria-label={settings.i18n.labels.next}
          class={cn(local.class)}
          {...others}
        >
          {local.children ?? <ChevronRight class="size-4" aria-hidden="true" />}
        </Button>
      )}
    />
  );
}

interface GanttTitleProps extends ComponentProps<"div"> {
  format?: (ctx: { title: string }) => JSX.Element;
}

function GanttTitle(props: GanttTitleProps) {
  const [local, others] = splitProps(props, ["class", "format"]);
  const nav = useGanttNavigation();
  return (
    <div
      data-slot="gantt-title"
      aria-live="polite"
      class={cn("min-w-0 truncate font-semibold text-sm", local.class)}
      {...others}
    >
      {local.format?.({ title: nav.title() }) ?? nav.title()}
    </div>
  );
}

interface GanttScaleSwitcherProps extends Omit<ComponentProps<"button">, "children"> {
  children?: JSX.Element;
  /** Hover/focus-visible hint; defaults to the "Select view" label. Pass
   *  null to disable (overlay-opener policy). */
  tooltip?: JSX.Element | null;
  /** The offered scales, in menu order. Default: all five. */
  scales?: GanttScale[];
}

/**
 * Scale switcher ("Select view"): Day / Week / Month / Quarter / Year, a ghost
 * dropdown button (same shape as the event-calendar view switcher).
 */
function GanttScaleSwitcher(props: GanttScaleSwitcherProps) {
  const [local, others] = splitProps(props, ["class", "children", "tooltip", "scales"]);
  const { scale, setScale } = useGanttScale();
  const settings = useGanttSettings();
  const navStyle = useNavButtonProps();
  const labels = () => settings.i18n.labels;
  // Controlled open: selecting a scale swaps the whole track subtree in the
  // same click, so closing must not depend on the menu's internal handler.
  const [open, setOpen] = createSignal(false);
  // Hover-only tooltip: when the menu closes, Kobalte focuses the trigger
  // again and a focus-opened tooltip would flash - ignore focus opens.
  const [tipOpen, setTipOpen] = createSignal(false);
  // One owned memo, read as a single call below - see the note in gantt-bar.
  const tipVisible = createMemo(() => tipOpen() && !open());

  const selectScale = (next: GanttScale) => {
    setOpen(false);
    setScale(next);
  };

  return (
    <DropdownMenu
      placement="bottom-start"
      open={open()}
      onOpenChange={(next: boolean) => {
        setOpen(next);
        if (next) setTipOpen(false);
      }}
    >
      {/* Tooltip on an overlay-opener: hover-only (focus opens ignored) and
          force-closed while the menu is up, so it never lingers or flashes
          when focus returns on close. */}
      <Tooltip
        open={tipVisible()}
        onOpenChange={(next, details) => {
          // opens are hover-only; the trigger-focus open that follows a
          // menu close is ignored, closes always land
          if (next && details?.reason !== "trigger-hover") return;
          setTipOpen(next);
        }}
      >
        <MenuTriggerButton
          as={(menuProps: ComponentProps<"button">) => (
            <TooltipTrigger
              as={(triggerProps: ComponentProps<"button">) => (
                <Button
                  {...triggerProps}
                  variant={navStyle().variant}
                  size={navStyle().size}
                  data-slot="gantt-scale-switcher"
                  aria-label={labels().selectView}
                  class={cn("gap-1", local.class)}
                />
              )}
              {...menuProps}
            />
          )}
          {...others}
        >
          {local.children ?? (
            <>
              {labels().scales[scale()]}
              <ChevronDown class="size-4 opacity-60" aria-hidden="true" />
            </>
          )}
        </MenuTriggerButton>
        <Show when={tipVisible() && local.tooltip !== null}>
          <TooltipContent side="bottom">{local.tooltip ?? labels().selectView}</TooltipContent>
        </Show>
      </Tooltip>
      <DropdownMenuContent class="min-w-36">
        {/* Kobalte contract: GroupLabel must live inside Menu.Group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel class="font-normal text-muted-foreground">
            {labels().selectView}
          </DropdownMenuLabel>
          <For each={local.scales ?? GANTT_SCALES}>
            {(value) => (
              <DropdownMenuItem
                data-active={scale() === value || undefined}
                onSelect={() => selectScale(value)}
              >
                {labels().scales[value]}
              </DropdownMenuItem>
            )}
          </For>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface GanttDatePickerProps {
  class?: string;
}

/**
 * Compact go-to-date picker (shadcn Calendar in a popover). No tooltip by
 * design: it opens an overlay (see the NavButtonProps tooltip policy).
 */
function GanttDatePicker(props: GanttDatePickerProps) {
  const nav = useGanttNavigation();
  const settings = useGanttSettings();
  const navStyle = useNavButtonProps();
  const [open, setOpen] = createSignal(false);
  const zoned = () => toZoned(nav.date(), settings.timeZone);

  return (
    <Popover placement="bottom-start" open={open()} onOpenChange={setOpen}>
      <PopoverTrigger
        as={(triggerProps: ComponentProps<"button">) => (
          <Button
            {...triggerProps}
            variant={navStyle().variant}
            size={navStyle().iconSize}
            data-slot="gantt-date-picker"
            aria-label={settings.i18n.labels.goToDate}
            class={cn(props.class)}
          >
            <CalendarIcon class="size-4" aria-hidden="true" />
          </Button>
        )}
      />
      <PopoverContent class="w-auto p-0!">
        <Calendar
          mode="single"
          selected={zoned()}
          defaultMonth={zoned()}
          locale={settings.locale}
          weekStartsOn={settings.weekStartsOn}
          onSelect={(next: Date | undefined) => {
            if (next) {
              nav.goTo(next);
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

type GanttToolbarProps = ComponentProps<"div">;

/** Free slot for consumer toolbar buttons; pure layout shell. */
function GanttToolbar(props: GanttToolbarProps) {
  const [local, others] = splitProps(props, ["class", "children"]);
  const viewConfig = useGanttViewConfig();
  return (
    <div
      data-slot="gantt-toolbar"
      class={cn("flex items-center gap-2", viewConfig.classNames?.toolbar, local.class)}
      {...others}
    >
      {local.children}
    </div>
  );
}

type GanttNavProps = ComponentProps<"div">;

/**
 * Default composed nav (event-calendar parity): Today, time-period switcher,
 * prev/next, title, spacer. GanttDatePicker stays available for custom
 * compositions. Pass children to use it as a pure layout shell instead.
 */
function GanttNav(props: GanttNavProps) {
  const [local, others] = splitProps(props, ["class", "children"]);
  const viewConfig = useGanttViewConfig();
  return (
    <div
      data-slot="gantt-nav"
      class={cn(
        // px so the toolbar controls do not hug the container edge; border-b
        // separates the toolbar from the column header below it
        "flex min-w-0 flex-wrap items-center gap-2 border-b px-3 py-2",
        viewConfig.stickyNav && "sticky top-0 z-30 bg-background",
        viewConfig.classNames?.nav,
        local.class,
      )}
      {...others}
    >
      {local.children ?? (
        // Shared provider: first tooltip waits, moving between buttons is instant
        <TooltipProvider delay={600} closeDelay={0} timeout={300}>
          <GanttNavToday />
          <GanttScaleSwitcher />
          <div class="flex items-center">
            <GanttNavPrev />
            <GanttNavNext />
          </div>
          <GanttTitle />
          <div class="grow" />
        </TooltipProvider>
      )}
    </div>
  );
}

export type {
  GanttDatePickerProps,
  GanttNavProps,
  GanttScaleSwitcherProps,
  GanttTitleProps,
  GanttToolbarProps,
};
export {
  GANTT_SCALES,
  GanttDatePicker,
  GanttNav,
  GanttNavNext,
  GanttNavPrev,
  GanttNavToday,
  GanttScaleSwitcher,
  GanttTitle,
  GanttToolbar,
};
