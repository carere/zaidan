import { Settings2Icon } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import { cn } from "@/lib/utils";
import { FieldGroup } from "@/registry/ui/field";
import {
  BaseColorPicker,
  ComponentLibraryPicker,
  FontPicker,
  IconLibraryPicker,
  MenuAccentPicker,
  MenuColorPicker,
  RadiusPicker,
  StylePicker,
  ThemePicker,
} from "./pickers";

export function Customizer(props: ComponentProps<"div">) {
  return (
    <div
      class={cn(
        "no-scrollbar -mx-2.5 flex flex-col overflow-y-auto p-1 md:mx-0 md:h-[calc(100svh-var(--header-height)-2rem)] md:w-48 md:gap-0 md:py-0",
        props.class,
      )}
    >
      <div class="hidden items-center gap-2 px-[calc(--spacing(2.5))] pb-1 md:flex md:flex-col md:items-start">
        <Settings2Icon class="size-4" strokeWidth={2} />
        <div class="relative flex flex-col gap-1 rounded-lg text-[13px]/snug">
          <div class="flex items-center gap-1 text-balance font-medium">
            Build your own shadcn/ui
          </div>
          <div class="hidden md:flex">
            When you&apos;re done, click Create Project to start a new project.
          </div>
        </div>
      </div>
      <div class="no-scrollbar h-14 overflow-x-auto overflow-y-hidden p-px md:h-full md:overflow-y-auto md:overflow-x-hidden">
        <FieldGroup class="flex h-full flex-1 flex-row gap-2 md:flex-col md:gap-0">
          <ComponentLibraryPicker />
          <StylePicker />
          <BaseColorPicker />
          <ThemePicker />
          <IconLibraryPicker />
          <FontPicker />
          <RadiusPicker />
          <MenuColorPicker />
          <MenuAccentPicker />
        </FieldGroup>
      </div>
    </div>
  );
}
