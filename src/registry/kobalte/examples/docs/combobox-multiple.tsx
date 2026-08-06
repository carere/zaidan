import { For } from "solid-js";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/registry/kobalte/ui/combobox";

const frameworks = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"];

export default function ComboboxMultiple() {
  const anchor = useComboboxAnchor();

  return (
    <Combobox<string, true>
      items={frameworks}
      multiple
      autoHighlight
      defaultValue={[frameworks[0]]}
    >
      <ComboboxChips ref={anchor} class="w-full max-w-xs">
        <ComboboxValue>
          {(values) => (
            <>
              <For each={values as string[]}>{(value) => <ComboboxChip>{value}</ComboboxChip>}</For>
              <ComboboxChipsInput />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => <ComboboxItem value={item}>{item}</ComboboxItem>}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
