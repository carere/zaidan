import { createSignal } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

export default function DropdownMenuRadioGroupDemo() {
  const [position, setPosition] = createSignal("bottom");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
        Open
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-32">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Panel Position</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={position()} onChange={setPosition}>
            <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
