import { ArrowUpIcon, CheckIcon, InfoIcon, PlusIcon, Search } from "lucide-solid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/registry/kobalte/ui/input-group";
import { Separator } from "@/registry/kobalte/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

export default function InputGroupDemo() {
  return (
    <div class="grid w-full max-w-sm gap-6">
      <InputGroup>
        <InputGroupInput placeholder="Search..." />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="example.com" class="pl-1!" />
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger
              as={InputGroupButton}
              class="rounded-full"
              size="icon-xs"
              aria-label="Info"
            >
              <InfoIcon />
            </TooltipTrigger>
            <TooltipContent>This is content in a tooltip.</TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupTextarea placeholder="Ask, Search or Chat..." />
        <InputGroupAddon align="block-end">
          <InputGroupButton variant="outline" class="rounded-full" size="icon-xs" aria-label="Add">
            <PlusIcon />
          </InputGroupButton>
          <DropdownMenu placement="top-start">
            <DropdownMenuTrigger as={InputGroupButton} variant="ghost">
              Auto
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Auto</DropdownMenuItem>
              <DropdownMenuItem>Agent</DropdownMenuItem>
              <DropdownMenuItem>Manual</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <InputGroupText class="ml-auto">52% used</InputGroupText>
          <Separator orientation="vertical" class="h-4!" />
          <InputGroupButton variant="default" class="rounded-full" size="icon-xs">
            <ArrowUpIcon />
            <span class="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="@shadcn" />
        <InputGroupAddon align="inline-end">
          <div class="flex size-4 items-center justify-center rounded-full bg-primary text-foreground">
            <CheckIcon class="size-3 text-white" />
          </div>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
