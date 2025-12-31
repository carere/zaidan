import { createSignal } from "solid-js";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select";

const styles = ["vega", "nova", "lyra", "maia", "mira"] as const;

type StyleSwitcherProps = {
  onStyleChange: (style: (typeof styles)[number]) => void;
};

export function StyleSwitcher(props: StyleSwitcherProps) {
  const [value, setValue] = createSignal<(typeof styles)[number]>(styles[0]);

  return (
    <Select
      itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
      onChange={(e) => {
        setValue(e as (typeof styles)[number]);
        props.onStyleChange(e as (typeof styles)[number]);
      }}
      options={["vega", "nova", "lyra", "maia", "mira"]}
      placeholder="Select a style"
      defaultValue={styles[0]}
      value={value()}
      class="w-[180px]"
    >
      <SelectTrigger aria-label="Style" class="w-[180px]">
        <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Styles</SelectLabel>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
