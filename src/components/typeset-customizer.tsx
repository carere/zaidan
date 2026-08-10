import { createMemo, createSignal, type JSX, onCleanup } from "solid-js";
import { MainMenu } from "@/components/designer/main-menu";
import { Picker, type PickerGroup } from "@/components/designer/picker";
import { TypesetOpenCode } from "@/components/typeset-open-code";
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
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/registry/kobalte/ui/card";
import { FieldGroup, FieldSeparator } from "@/registry/kobalte/ui/field";

type CustomizerProps = {
  params: TypesetParams;
  code: string;
  locks: ReadonlySet<LockableParam>;
  onCommit: (key: LockableParam, value: string) => void;
  onPreview: (key: LockableParam, value?: string) => void;
  onToggleLock: (key: LockableParam) => void;
  onNavigate: () => void;
  onOpenCode: (code: string) => void;
  onShuffle: () => void;
  onToggleMode: () => void;
  onCopyCode: () => void | Promise<void>;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  setupAction: JSX.Element;
};

/** Every face, grouped by kind — the pickers do not filter by type. */
const FONT_GROUPS = [
  { label: "Sans", type: "sans" },
  { label: "Serif", type: "serif" },
  { label: "Mono", type: "mono" },
] as const;

function fontOption(font: (typeof TYPESET_FONTS)[number]) {
  return {
    value: font.id,
    label: font.label,
    preview: () => <span style={{ "font-family": font.value }}>Aa</span>,
  };
}

export function TypesetCustomizer(props: CustomizerProps) {
  const [openCodeOpen, setOpenCodeOpen] = createSignal(false);
  const [hasCopiedCode, setHasCopiedCode] = createSignal(false);
  // The label is the short form; the clipboard gets the full registry item,
  // which is what you actually paste into `shadcn add`.
  const copyCodeLabel = createMemo(() => (hasCopiedCode() ? "Copied" : `typeset-${props.code}`));
  let copyCodeTimer: ReturnType<typeof setTimeout> | undefined;

  const handleCopyCode = async () => {
    await props.onCopyCode();
    setHasCopiedCode(true);
    if (copyCodeTimer) clearTimeout(copyCodeTimer);
    copyCodeTimer = setTimeout(() => setHasCopiedCode(false), 2000);
  };

  onCleanup(() => {
    if (copyCodeTimer) clearTimeout(copyCodeTimer);
  });

  // Resolve the rhythm to px off the current size: leading is a multiple,
  // flow is an em value.
  const sizePx = createMemo(() => Number(props.params.scale));
  const leadingPx = createMemo(() => Math.round(sizePx() * Number(props.params.leading)));
  const flowPx = createMemo(() => Math.round(sizePx() * Number.parseFloat(props.params.flow)));

  const bodyFont = createMemo(() => findTypesetFont(props.params.body) ?? TYPESET_FONTS[0]);

  // Heading defaults to "inherit", which reads as "same as body".
  const resolvedFont = (param: "body" | "heading" | "mono") => {
    const value = props.params[param];
    return param === "heading" && value === "inherit"
      ? bodyFont()
      : (findTypesetFont(value) ?? bodyFont());
  };

  const fontGroups = (param: "body" | "heading" | "mono"): PickerGroup[] => [
    ...(param === "heading"
      ? [{ options: [{ ...fontOption(bodyFont()), value: "inherit" }] }]
      : []),
    ...FONT_GROUPS.map((group) => ({
      label: group.label,
      options: TYPESET_FONTS.filter((font) => font.type === group.type).map(fontOption),
    })),
  ];

  const fontPicker = (label: string, param: "body" | "heading" | "mono") => (
    <Picker
      label={label}
      configKey={param}
      value={props.params[param]}
      groups={fontGroups(param)}
      icon={() => <span style={{ "font-family": resolvedFont(param)?.value }}>Aa</span>}
      locked={props.locks.has(param)}
      onCommit={props.onCommit}
      onPreview={props.onPreview}
      onToggleLock={props.onToggleLock}
    />
  );

  const optionPicker = (
    label: string,
    param: LockableParam,
    options: readonly { value: string | number; label: string }[],
    icon: () => JSX.Element,
    extraClass?: string,
  ) => (
    <Picker
      label={label}
      configKey={param}
      value={String(props.params[param])}
      options={options.map((option) => ({ value: String(option.value), label: option.label }))}
      icon={icon}
      class={extraClass}
      locked={props.locks.has(param)}
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
      <CardHeader class="hidden border-border border-b px-3 md:flex">
        <MainMenu
          items={[
            { label: "Specimen…", shortcut: "⌘P", onSelect: props.onNavigate },
            { label: "Open Typeset…", shortcut: "O", onSelect: () => setOpenCodeOpen(true) },
            { label: "Shuffle", shortcut: "R", onSelect: props.onShuffle },
            { label: "Light/Dark", shortcut: "D", onSelect: props.onToggleMode },
            { label: "Undo", shortcut: "⌘Z", separatorBefore: true, onSelect: props.onUndo },
            { label: "Redo", shortcut: "⇧⌘Z", onSelect: props.onRedo },
            { label: "Reset", shortcut: "⇧R", separatorBefore: true, onSelect: props.onReset },
          ]}
        />
      </CardHeader>
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
          {fontPicker("Heading", "heading")}
          {fontPicker("Body", "body")}
          {fontPicker("Mono", "mono")}
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
      <CardFooter class="flex min-w-0 flex-wrap gap-2 border-border border-t bg-muted/50 p-3 md:flex-col md:flex-nowrap md:rounded-b-none md:**:[button,a]:w-full">
        <Button
          variant="outline"
          class="min-w-0 flex-1 touch-manipulation bg-transparent px-2 font-normal text-sm transition-none md:flex-none"
          title={`@zaidan/typeset-${props.code}`}
          onClick={handleCopyCode}
        >
          <span class="block min-w-0 truncate" aria-live="polite">
            {copyCodeLabel()}
          </span>
        </Button>
        <TypesetOpenCode
          open={openCodeOpen()}
          onOpenChange={setOpenCodeOpen}
          onOpenCode={props.onOpenCode}
        />
        <Button
          variant="outline"
          class="min-w-0 flex-1 touch-manipulation bg-transparent px-2 font-normal text-sm transition-none md:flex-none"
          onClick={props.onShuffle}
        >
          <span class="w-full truncate text-center font-normal">Shuffle</span>
        </Button>
        <div class="flex w-full min-w-0 md:w-auto md:flex-col xl:hidden">{props.setupAction}</div>
      </CardFooter>
    </Card>
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
