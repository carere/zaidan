import { createSignal } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

export default function DropdownMenuCheckboxes() {
  const [showStatusBar, setShowStatusBar] = createSignal(true);
  const [showActivityBar, setShowActivityBar] = createSignal(false);
  const [showPanel, setShowPanel] = createSignal(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
        Open
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={showStatusBar()} onChange={setShowStatusBar}>
            Status Bar
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showActivityBar()}
            onChange={setShowActivityBar}
            disabled
          >
            Activity Bar
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={showPanel()} onChange={setShowPanel}>
            Panel
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
