import { useStyle } from "@/lib/style-context";
import type { Style } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select";

export function StyleSwitcher() {
  const { style, setStyle } = useStyle();

  return (
    <Select
      itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
      onChange={(e) => setStyle(e as Style)}
      options={["vega", "nova", "lyra", "maia", "mira"]}
      placeholder="Select a style"
      defaultValue={style()}
      value={style()}
    >
      <SelectTrigger aria-label="Style" class="w-[180px]">
        <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
      </SelectTrigger>
      <SelectContent />
    </Select>
  );
}
