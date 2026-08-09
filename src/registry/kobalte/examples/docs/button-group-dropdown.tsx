import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Share,
  Trash,
  UserRoundX,
  VolumeOff,
} from "lucide-solid";

import { Button, buttonVariants } from "@/registry/kobalte/ui/button";
import { ButtonGroup } from "@/registry/kobalte/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

export default function ButtonGroupDropdown() {
  return (
    <ButtonGroup>
      <Button variant="outline">Follow</Button>
      <DropdownMenu placement="bottom-end">
        <DropdownMenuTrigger
          class={`${buttonVariants({ variant: "outline" })} pl-2!`}
          aria-label="More options"
        >
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <VolumeOff />
              Mute Conversation
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Check />
              Mark as Read
            </DropdownMenuItem>
            <DropdownMenuItem>
              <AlertTriangle />
              Report Conversation
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserRoundX />
              Block User
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share />
              Share Conversation
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy />
              Copy Conversation
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive">
              <Trash />
              Delete Conversation
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
