import { FieldSeparator } from "@/registry/kobalte/ui/field";

import AppearanceSettings from "./appearance-settings";
import ButtonGroupDemo from "./button-group-demo";
import ButtonGroupInputGroup from "./button-group-input-group";
import ButtonGroupNested from "./button-group-nested";
import ButtonGroupPopover from "./button-group-popover";
import EmptyAvatarGroup from "./empty-avatar-group";
import FieldCheckbox from "./field-checkbox";
import FieldDemo from "./field-demo";
import FieldHear from "./field-hear";
import FieldSlider from "./field-slider";
import InputGroupButtonExample from "./input-group-button";
import InputGroupDemo from "./input-group-demo";
import ItemDemo from "./item-demo";
import NotionPromptForm from "./notion-prompt-form";
import SpinnerBadge from "./spinner-badge";

export function RootComponents() {
  return (
    <div class="theme-container mx-auto grid gap-10 py-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-8 2xl:gap-10">
      <div class="flex flex-col gap-6 *:[div]:w-full *:[div]:max-w-full">
        <FieldDemo />
      </div>
      <div class="flex flex-col gap-6 *:[div]:w-full *:[div]:max-w-full">
        <EmptyAvatarGroup />
        <SpinnerBadge />
        <ButtonGroupInputGroup />
        <FieldSlider />
        <InputGroupDemo />
      </div>
      <div class="flex flex-col gap-6 *:[div]:w-full *:[div]:max-w-full">
        <InputGroupButtonExample />
        <ItemDemo />
        <FieldSeparator class="my-4">Appearance Settings</FieldSeparator>
        <AppearanceSettings />
      </div>
      <div class="order-first flex flex-col gap-6 lg:hidden xl:order-last xl:flex *:[div]:w-full *:[div]:max-w-full">
        <NotionPromptForm />
        <ButtonGroupDemo />
        <FieldCheckbox />
        <div class="flex justify-between gap-4">
          <ButtonGroupNested />
          <ButtonGroupPopover />
        </div>
        <FieldHear />
      </div>
    </div>
  );
}
