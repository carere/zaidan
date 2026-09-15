import { ChevronDownIcon, MoreHorizontalIcon } from "lucide-solid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/kobalte/ui/input-group";

export default function InputGroupDropdown() {
  return (
    <div class="grid w-full max-w-sm gap-4">
      <InputGroup>
        <InputGroupInput placeholder="Enter file name" />
        <InputGroupAddon align="inline-end">
          <DropdownMenu placement="bottom-end" gutter={8}>
            <DropdownMenuTrigger
              as={InputGroupButton}
              variant="ghost"
              aria-label="More"
              size="icon-xs"
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Copy path</DropdownMenuItem>
                <DropdownMenuItem>Open location</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Enter search query" />
        <InputGroupAddon align="inline-end">
          <DropdownMenu placement="bottom-end" gutter={8}>
            <DropdownMenuTrigger as={InputGroupButton} variant="ghost" class="pr-1.5! text-xs">
              Search In... <ChevronDownIcon class="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem>Documentation</DropdownMenuItem>
                <DropdownMenuItem>Blog Posts</DropdownMenuItem>
                <DropdownMenuItem>Changelog</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
