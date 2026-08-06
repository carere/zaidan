import { Bold, Italic, Underline } from "lucide-solid";

import { ToggleGroup, ToggleGroupItem } from "@/registry/kobalte/ui/toggle-group";

export default function ToggleGroupVertical() {
  return (
    <ToggleGroup multiple orientation="vertical" spacing={1} defaultValue={["bold", "italic"]}>
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <Bold />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <Italic />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Toggle underline">
        <Underline />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
