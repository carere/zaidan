import { For } from "solid-js";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxValue,
} from "@/registry/kobalte/ui/combobox";

const frameworks = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"];

export default function ComboboxMultiple() {
  return (
    <Combobox<(typeof frameworks)[number]>
      options={frameworks}
      placeholder="Select frameworks..."
      multiple
      triggerMode="focus"
      defaultValue={[frameworks[0]]}
      itemComponent={(props) => (
        <ComboboxItem item={props.item}>{props.item.rawValue}</ComboboxItem>
      )}
    >
      <ComboboxChips class="w-full max-w-xs">
        <ComboboxValue<string>>
          {(values) => (
            <For each={values}>{(value) => <ComboboxChip value={value}>{value}</ComboboxChip>}</For>
          )}
        </ComboboxValue>
        <ComboboxChipsInput placeholder="Add framework..." />
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>No frameworks found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
