import { createMemo, For, type JSX, Show } from "solid-js";
import {
  findTypesetFont,
  type LockableParam,
  TYPESET_FLOWS,
  TYPESET_FONTS,
  TYPESET_LEADINGS,
  TYPESET_MEASURES,
  TYPESET_SIZES,
  type TypesetParams,
} from "@/lib/typeset";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/registry/kobalte/hooks/use-mobile";
import { Card, CardContent, CardFooter, CardHeader } from "@/registry/kobalte/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import { FieldGroup, FieldSeparator } from "@/registry/kobalte/ui/field";

const pickerContentClass =
  "dark no-scrollbar max-h-96 w-[calc(100svw-var(--spacing)*6)] min-w-32 overflow-y-auto rounded-xl border-0 bg-neutral-950/80 p-1.5 text-neutral-100 ring-1 ring-neutral-950/80 shadow-xl backdrop-blur-xl md:w-52 dark:bg-neutral-800/90 dark:ring-neutral-700/50";
const pickerTriggerClass =
  "relative w-36 shrink-0 touch-manipulation rounded-xl p-3 ring-1 ring-foreground/10 select-none hover:bg-muted focus-visible:ring-foreground/50 focus-visible:outline-none disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:px-2.5 md:py-2";
const radioItemClass =
  "rounded-lg py-1.5 pr-8 pl-2 font-medium text-sm **:text-neutral-100 data-highlighted:bg-neutral-600 data-highlighted:text-neutral-100 pointer-coarse:py-2.5 pointer-coarse:pl-3 pointer-coarse:text-base";

type CustomizerProps = {
  params: TypesetParams;
  locks: ReadonlySet<LockableParam>;
  onCommit: (key: LockableParam, value: string) => void;
  onPreview: (key: LockableParam, value?: string) => void;
  onToggleLock: (key: LockableParam) => void;
  onShuffle: () => void;
  header?: JSX.Element;
  footerAction?: JSX.Element;
};

export function TypesetCustomizer(props: CustomizerProps) {
  const isMobile = useIsMobile();

  // Resolve the rhythm to px off the current size: leading is a multiple,
  // flow is an em value.
  const sizePx = createMemo(() => Number(props.params.scale));
  const leadingPx = createMemo(() => Math.round(sizePx() * Number(props.params.leading)));
  const flowPx = createMemo(() => Math.round(sizePx() * Number.parseFloat(props.params.flow)));

  const optionPicker = (
    label: string,
    param: LockableParam,
    options: readonly { value: string | number; label: string }[],
    icon: () => JSX.Element,
    extraClass?: string,
  ) => (
    <OptionPicker
      label={label}
      param={param}
      options={options}
      icon={icon}
      class={extraClass}
      value={String(props.params[param])}
      locked={props.locks.has(param)}
      isMobile={isMobile()}
      onCommit={props.onCommit}
      onPreview={props.onPreview}
      onToggleLock={props.onToggleLock}
    />
  );

  return (
    <Card
      size="sm"
      class="dark isolate z-10 max-h-full min-h-0 w-full self-start rounded-2xl bg-card/90 pb-0 text-card-foreground shadow-sm backdrop-blur-xl md:h-full md:w-(--customizer-width)"
    >
      {/* `when` must be a plain boolean, not the element itself: using a JSX
          element as a reactive condition breaks hydration (Solid tries to
          match it against a template and throws in getNextElement). */}
      <Show when={props.header !== undefined}>
        <CardHeader class="hidden items-center justify-between gap-2 border-border border-b px-3 md:flex">
          {props.header}
        </CardHeader>
      </Show>
      <CardContent class="no-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-3 md:overflow-y-auto">
        <FieldGroup class="flex-row gap-2.5 py-px **:data-[slot=field-separator]:-mx-3 **:data-[slot=field-separator]:w-auto **:data-[slot=separator]:bg-border **:data-[slot=separator]:border-0 md:flex-col md:gap-3.25">
          {/* Below ~60ch the viewport already constrains width, so measure
              does nothing: hide it. */}
          {optionPicker(
            "Measure",
            "measure",
            TYPESET_MEASURES,
            () => (
              <MeasureIcon />
            ),
            "max-[28rem]:hidden",
          )}
          <FieldSeparator class="hidden md:block" />
          <FontPicker
            label="Heading"
            param="heading"
            params={props.params}
            locked={props.locks.has("heading")}
            isMobile={isMobile()}
            onCommit={props.onCommit}
            onPreview={props.onPreview}
            onToggleLock={props.onToggleLock}
          />
          <FontPicker
            label="Body"
            param="body"
            params={props.params}
            locked={props.locks.has("body")}
            isMobile={isMobile()}
            onCommit={props.onCommit}
            onPreview={props.onPreview}
            onToggleLock={props.onToggleLock}
          />
          <FontPicker
            label="Mono"
            param="mono"
            params={props.params}
            locked={props.locks.has("mono")}
            isMobile={isMobile()}
            onCommit={props.onCommit}
            onPreview={props.onPreview}
            onToggleLock={props.onToggleLock}
          />
          <FieldSeparator class="hidden md:block" />
          {optionPicker("Size", "scale", TYPESET_SIZES, () => (
            <SizeIcon />
          ))}
          {optionPicker("Leading", "leading", TYPESET_LEADINGS, () => (
            <LeadingIcon />
          ))}
          {optionPicker("Flow", "flow", TYPESET_FLOWS, () => (
            <FlowIcon />
          ))}
          <div class="hidden px-1 pt-0.5 text-center font-mono text-muted-foreground text-xs tabular-nums md:block">
            {sizePx()}px / {leadingPx()}px / {flowPx()}px
          </div>
          {/* Scroll-end spacer: the group is a container-query container, so
              trailing padding cannot grow it. */}
          <div aria-hidden="true" class="w-0.5 shrink-0 md:hidden" />
        </FieldGroup>
      </CardContent>
      <CardFooter class="flex min-w-0 flex-row-reverse gap-2 border-border border-t py-3 md:flex-col md:**:[button]:w-full">
        <button
          type="button"
          onClick={props.onShuffle}
          class="min-w-0 flex-1 touch-manipulation select-none rounded-lg px-2 py-1.5 font-medium text-sm ring-1 ring-foreground/10 transition-none hover:bg-muted md:flex-none pointer-coarse:h-10"
        >
          <span class="w-full truncate text-center">Shuffle</span>
        </button>
        {props.footerAction}
      </CardFooter>
    </Card>
  );
}

function OptionPicker(props: {
  label: string;
  param: LockableParam;
  options: readonly { value: string | number; label: string }[];
  icon: () => JSX.Element;
  value: string;
  locked: boolean;
  isMobile: boolean;
  class?: string;
  onCommit: (key: LockableParam, value: string) => void;
  onPreview: (key: LockableParam, value?: string) => void;
  onToggleLock: (key: LockableParam) => void;
}) {
  const current = createMemo(() =>
    props.options.find((option) => String(option.value) === props.value),
  );

  return (
    <div class={cn("group/picker relative", props.class)}>
      <DropdownMenu
        placement={props.isMobile ? "top" : "right-start"}
        gutter={props.isMobile ? 16 : 20}
        onOpenChange={(next) => !next && props.onPreview(props.param)}
      >
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <span class="flex min-w-0 flex-col justify-start pr-8 text-left">
            <span class="font-normal text-muted-foreground text-xs">{props.label}</span>
            <span class="line-clamp-1 font-medium text-foreground text-sm">{current()?.label}</span>
          </span>
          <span class="pointer-events-none absolute top-1/2 right-4 flex size-4 -translate-y-1/2 items-center justify-center text-foreground select-none md:right-2.5">
            {props.icon()}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class={pickerContentClass}
          onMouseLeave={() => props.onPreview(props.param)}
        >
          <DropdownMenuRadioGroup
            value={props.value}
            onChange={(value) => props.onCommit(props.param, value)}
          >
            <For each={props.options}>
              {(option) => (
                <DropdownMenuRadioItem
                  value={String(option.value)}
                  // Kobalte defaults radio items to staying open on select;
                  // upstream's picker closes, and so does this one.
                  closeOnSelect
                  class={radioItemClass}
                  onMouseMove={() =>
                    !props.isMobile && props.onPreview(props.param, String(option.value))
                  }
                  onFocus={() =>
                    !props.isMobile && props.onPreview(props.param, String(option.value))
                  }
                >
                  {option.label}
                </DropdownMenuRadioItem>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <LockButton
        locked={props.locked}
        onToggle={() => props.onToggleLock(props.param)}
        class="absolute top-1/2 right-8 -translate-y-1/2"
      />
    </div>
  );
}

function FontPicker(props: {
  label: string;
  param: "body" | "heading" | "mono";
  params: TypesetParams;
  locked: boolean;
  isMobile: boolean;
  onCommit: (key: LockableParam, value: string) => void;
  onPreview: (key: LockableParam, value?: string) => void;
  onToggleLock: (key: LockableParam) => void;
}) {
  const currentValue = createMemo(() => props.params[props.param]);
  const bodyFont = createMemo(() => findTypesetFont(props.params.body) ?? TYPESET_FONTS[0]);
  // Heading defaults to "inherit", which reads as "same as body".
  const currentFont = createMemo(() =>
    props.param === "heading" && currentValue() === "inherit"
      ? bodyFont()
      : (findTypesetFont(currentValue()) ?? bodyFont()),
  );

  // Every picker offers every font (no type filter); grouping is just labels.
  const groups = [
    { label: "Sans", type: "sans" },
    { label: "Serif", type: "serif" },
    { label: "Mono", type: "mono" },
  ] as const;

  return (
    <div class="group/picker relative">
      <DropdownMenu
        placement={props.isMobile ? "top" : "right-start"}
        gutter={props.isMobile ? 16 : 20}
        onOpenChange={(next) => !next && props.onPreview(props.param)}
      >
        <DropdownMenuTrigger class={pickerTriggerClass}>
          <span class="flex flex-col justify-start text-left">
            <span class="font-normal text-muted-foreground text-xs">{props.label}</span>
            <span class="line-clamp-1 max-w-[80%] truncate font-medium text-foreground text-sm">
              {currentFont()?.label}
            </span>
          </span>
          <span
            class="pointer-events-none absolute top-1/2 right-4 flex size-4 -translate-y-1/2 items-center justify-center text-base text-foreground select-none md:right-2.5"
            style={{ "font-family": currentFont()?.value }}
          >
            Aa
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class={pickerContentClass}
          onMouseLeave={() => props.onPreview(props.param)}
        >
          <DropdownMenuRadioGroup
            value={currentValue()}
            onChange={(value) => props.onCommit(props.param, value)}
          >
            <Show when={props.param === "heading"}>
              <DropdownMenuGroup>
                <DropdownMenuRadioItem
                  value="inherit"
                  closeOnSelect
                  class={radioItemClass}
                  onMouseMove={() => !props.isMobile && props.onPreview(props.param, "inherit")}
                  onFocus={() => !props.isMobile && props.onPreview(props.param, "inherit")}
                >
                  {bodyFont()?.label}
                </DropdownMenuRadioItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator class="-mx-1.5 my-1.5 bg-neutral-600 dark:bg-neutral-700" />
            </Show>
            <For each={groups}>
              {(group) => (
                <DropdownMenuGroup>
                  <DropdownMenuLabel class="px-2 py-1.5 font-medium text-neutral-400 text-xs">
                    {group.label}
                  </DropdownMenuLabel>
                  <For each={TYPESET_FONTS.filter((font) => font.type === group.type)}>
                    {(font) => (
                      <DropdownMenuRadioItem
                        value={font.id}
                        closeOnSelect
                        class={radioItemClass}
                        onMouseMove={() => !props.isMobile && props.onPreview(props.param, font.id)}
                        onFocus={() => !props.isMobile && props.onPreview(props.param, font.id)}
                      >
                        {font.label}
                      </DropdownMenuRadioItem>
                    )}
                  </For>
                </DropdownMenuGroup>
              )}
            </For>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <LockButton
        locked={props.locked}
        onToggle={() => props.onToggleLock(props.param)}
        class="absolute top-1/2 right-8 -translate-y-1/2"
      />
    </div>
  );
}

function LockButton(props: { locked: boolean; onToggle: () => void; class?: string }) {
  const label = () => (props.locked ? "Unlock" : "Lock");

  return (
    <button
      type="button"
      title={label()}
      aria-label={label()}
      onClick={props.onToggle}
      data-locked={props.locked}
      class={cn(
        "flex size-4 cursor-pointer items-center justify-center rounded opacity-0 ring-foreground/60 transition-opacity outline-none group-focus-within/picker:opacity-100 group-hover/picker:opacity-100 focus:opacity-100 focus-visible:ring-1 data-[locked=true]:opacity-100 max-md:hidden pointer-coarse:hidden",
        props.class,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" class="size-5 text-foreground" aria-hidden="true">
        <path
          d="M4.26781 18.8447C4.49269 20.515 5.87613 21.8235 7.55966 21.9009C8.97627 21.966 10.4153 22 12 22C13.5847 22 15.0237 21.966 16.4403 21.9009C18.1239 21.8235 19.5073 20.515 19.7322 18.8447C19.879 17.7547 20 16.6376 20 15.5C20 14.3624 19.879 13.2453 19.7322 12.1553C19.5073 10.485 18.1239 9.17649 16.4403 9.09909C15.0237 9.03397 13.5847 9 12 9C10.4153 9 8.97627 9.03397 7.55966 9.09909C5.87613 9.17649 4.49269 10.485 4.26781 12.1553C4.12104 13.2453 4 14.3624 4 15.5C4 16.6376 4.12104 17.7547 4.26781 18.8447Z"
          stroke="currentColor"
          stroke-width="2"
        />
        <path
          d={
            props.locked
              ? "M7.5 9V6.5C7.5 4.01472 9.51472 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5V9"
              : "M7.5 9V6.5C7.5 4.01472 9.51472 2 12 2C13.9593 2 15.5 3.5 16 5"
          }
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M12.125 15.5H12M12.25 15.5C12.25 15.6381 12.1381 15.75 12 15.75C11.8619 15.75 11.75 15.6381 11.75 15.5C11.75 15.3619 11.8619 15.25 12 15.25C12.1381 15.25 12.25 15.3619 12.25 15.5Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
  );
}

function MeasureIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" class="size-4.5" aria-hidden="true">
      <path
        d="M3.5 4.5v15M20.5 4.5v15M3.5 12h17M6.5 9l-3 3 3 3M17.5 9l3 3-3 3"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function SizeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" class="size-4.5" aria-hidden="true">
      <path
        d="M3 6V4.5h9V6M7.5 4.5v15M5.5 19.5h4M13.5 12v-1h7.5v1M17.25 11v8.5M15.5 19.5h3.5"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function LeadingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" class="size-4.5" aria-hidden="true">
      <path
        d="M4.5 3.5H19.5M4.5 20.5H19.5M17 17L14.8905 11.4741C13.9109 8.90801 13.4211 7.625 12.625 7.625C11.8289 7.625 11.3391 8.90801 10.3595 11.4741L8.25 17M9.5 13H15.75"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  );
}

function FlowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" class="size-4.5" aria-hidden="true">
      <path
        d="M3.5 3.5h17M3.5 20.5h17M6 9.5h12M6 14.5h12"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  );
}
