import { CalendarDate, PersianCalendar, startOfWeek } from "@internationalized/date";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-solid";
import { createMemo, createSignal, For } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";

const persianCalendar = new PersianCalendar();
const numberFormatter = new Intl.NumberFormat("fa-IR-u-nu-arabext", { useGrouping: false });
const monthFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "full",
  timeZone: "UTC",
});
const weekdayFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "short",
  timeZone: "UTC",
});

const sameDay = (left: CalendarDate, right: CalendarDate) => left.compare(right) === 0;

export default function CalendarHijri() {
  const [month, setMonth] = createSignal(new CalendarDate(persianCalendar, 1404, 3, 1));
  const [selected, setSelected] = createSignal(new CalendarDate(persianCalendar, 1404, 3, 22));
  const focusDay = (day: CalendarDate) => {
    const target = document.querySelector<HTMLButtonElement>(
      `[data-persian-day="${day.toString()}"]`,
    );
    target?.focus();
  };
  const onDayKeyDown = (day: CalendarDate, event: KeyboardEvent) => {
    const offsets: Record<string, number> = {
      ArrowDown: 7,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
    };
    const offset = offsets[event.key];

    if (offset === undefined) return;
    event.preventDefault();
    focusDay(day.add({ days: offset }));
  };
  const weekdays = createMemo(() => {
    const firstDay = startOfWeek(month(), "fa-IR");

    return Array.from({ length: 7 }, (_, index) =>
      weekdayFormatter.format(firstDay.add({ days: index }).toDate("UTC")),
    );
  });
  const days = createMemo(() => {
    const start = startOfWeek(month(), "fa-IR");
    return Array.from({ length: 42 }, (_, index) => start.add({ days: index }));
  });

  return (
    <div lang="fa" class="w-fit rounded-lg border bg-background p-3 [--cell-size:--spacing(8)]">
      <div class="mb-4 flex h-(--cell-size) items-center justify-between gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="ماه قبل"
          onClick={() => setMonth((value) => value.subtract({ months: 1 }))}
        >
          <ChevronRightIcon />
        </Button>
        <p class="text-sm font-medium">{monthFormatter.format(month().toDate("UTC"))}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="ماه بعد"
          onClick={() => setMonth((value) => value.add({ months: 1 }))}
        >
          <ChevronLeftIcon />
        </Button>
      </div>
      <table class="w-full border-collapse">
        <caption class="sr-only">تقویم فارسی</caption>
        <thead>
          <tr class="flex">
            <For each={weekdays()}>
              {(weekday) => (
                <th
                  scope="col"
                  class="flex-1 text-center text-[0.8rem] font-normal text-muted-foreground"
                >
                  {weekday}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={Array.from({ length: 6 })}>
            {(_, weekIndex) => (
              <tr class="mt-2 flex w-full">
                <For each={days().slice(weekIndex() * 7, weekIndex() * 7 + 7)}>
                  {(day) => {
                    const outside = () => day.month !== month().month;
                    const isSelected = () => sameDay(day, selected());

                    return (
                      <td class="relative flex-1 p-0 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={dayFormatter.format(day.toDate("UTC"))}
                          aria-selected={isSelected()}
                          data-selected={isSelected() || undefined}
                          data-persian-day={day.toString()}
                          class="size-(--cell-size) font-normal data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground"
                          classList={{ "text-muted-foreground": outside() }}
                          onClick={() => setSelected(day)}
                          onKeyDown={(event) => onDayKeyDown(day, event)}
                        >
                          {numberFormatter.format(day.day)}
                        </Button>
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
