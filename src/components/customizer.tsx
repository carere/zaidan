import { Settings2Icon } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import BaseColorPicker from "@/components/pickers/base-color-picker";
import BasePicker from "@/components/pickers/base-picker";
import FontPicker from "@/components/pickers/font-picker";
import IconLibraryPicker from "@/components/pickers/icon-library-picker";
import MenuAccentPicker from "@/components/pickers/menu-accent-picker";
import MenuColorPicker from "@/components/pickers/menu-color-picker";
import RadiusPicker from "@/components/pickers/radius-picker";
import StylePicker from "@/components/pickers/style-picker";
import ThemePicker from "@/components/pickers/theme-picker";
import { RandomButton } from "@/components/random-button";
import { ResetButton } from "@/components/reset-button";
import { cn } from "@/lib/utils";
import { FieldGroup } from "@/registry/ui/field";

export function Customizer(props: ComponentProps<"div">) {
  return (
    <div class={cn("no-scrollbar flex flex-col overflow-y-auto md:w-48", props.class)}>
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
      <div class="no-scrollbar h-15 overflow-x-auto overflow-y-hidden md:h-full md:overflow-y-auto md:overflow-x-hidden">
        <FieldGroup class="flex h-full flex-1 flex-row gap-2 md:flex-col md:gap-0">
          <BasePicker />
          <StylePicker />
          <BaseColorPicker />
          <ThemePicker />
          <IconLibraryPicker />
          <FontPicker />
          <RadiusPicker />
          <MenuColorPicker />
          <MenuAccentPicker />
          <div class="mt-auto hidden w-full flex-col items-center gap-0 md:flex">
            <RandomButton />
            <ResetButton />
          </div>
        </FieldGroup>
      </div>
    </div>
  );
}
