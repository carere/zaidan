import type { Style } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select";

type StyleSwitcherProps = {
  style: Style;
  onStyleChange: (style: Style) => void;
};

export function StyleSwitcher(props: StyleSwitcherProps) {
  return (
    <Select
      itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
      onChange={(e) => props.onStyleChange(e as Style)}
      options={["vega", "nova", "lyra", "maia", "mira"]}
      placeholder="Select a style"
      defaultValue={props.style}
      value={props.style}
    >
      <SelectTrigger aria-label="Style" class="w-[180px]">
        <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
      </SelectTrigger>
      <SelectContent />
    </Select>
  );
}
