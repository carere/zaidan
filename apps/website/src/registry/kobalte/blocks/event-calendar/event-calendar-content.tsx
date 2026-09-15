import type { Component, ComponentProps, JSX } from "solid-js";
import { splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "@/lib/utils";
import { useEventCalendarSelector, useEventCalendarViewConfig } from "./event-calendar";
import { EventCalendarAgendaView } from "./event-calendar-agenda-view";
import { EventCalendarMonthView } from "./event-calendar-month-view";
import { EventCalendarResourceView } from "./event-calendar-resource-view";
import {
  EventCalendarDaysView,
  EventCalendarDayView,
  EventCalendarWeekView,
} from "./event-calendar-time-grid";
import type { CalendarView } from "./event-calendar-types";

const DEFAULT_VIEW_COMPONENTS: Record<CalendarView, Component> = {
  month: EventCalendarMonthView,
  week: EventCalendarWeekView,
  day: EventCalendarDayView,
  days: EventCalendarDaysView,
  agenda: EventCalendarAgendaView,
  resource: EventCalendarResourceView,
};

interface EventCalendarContentProps extends Omit<ComponentProps<"div">, "children"> {
  /** Swap individual view implementations. */
  components?: Partial<Record<CalendarView, Component>>;
  /** Replaces the switchboard entirely; read useEventCalendarView() inside. */
  children?: JSX.Element;
}

function EventCalendarContent(props: EventCalendarContentProps) {
  const viewConfig = useEventCalendarViewConfig();
  const [local, others] = splitProps(props, ["class", "components", "children"]);
  const view = useEventCalendarSelector((state) => state.view);
  const loading = useEventCalendarSelector((state) => state.loading);

  const activeView = () => {
    const resolved = {
      ...DEFAULT_VIEW_COMPONENTS,
      ...viewConfig.components,
      ...local.components,
    };
    // A spread copies keys that hold `undefined`, so `components={{ month: isPro
    // ? ProMonth : undefined }}` would erase the default and render <undefined />.
    return resolved[view()] ?? DEFAULT_VIEW_COMPONENTS[view()];
  };

  return (
    <div
      data-slot="event-calendar-content"
      data-view={view()}
      data-loading={loading() || undefined}
      class={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col",
        "data-loading:pointer-events-none data-loading:opacity-60",
        viewConfig.classNames?.content,
        local.class,
      )}
      {...others}
    >
      {local.children ?? <Dynamic component={activeView()} />}
    </div>
  );
}

export type { EventCalendarContentProps };
export { DEFAULT_VIEW_COMPONENTS, EventCalendarContent };
