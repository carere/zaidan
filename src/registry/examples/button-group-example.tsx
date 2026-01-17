import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  ChevronDown,
  Copy,
  FlipHorizontal,
  FlipVertical,
  Heart,
  Minus,
  Plus,
  RotateCw,
  Search,
  Share,
  Trash,
  UserRoundX,
  VolumeX,
} from "lucide-solid";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/registry/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";
import { Field, FieldGroup } from "@/registry/ui/field";
import { Input } from "@/registry/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/ui/input-group";
import { Label } from "@/registry/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/ui/tooltip";

export default function ButtonGroupExample() {
  return (
    <ExampleWrapper>
      <ButtonGroupBasic />
      <ButtonGroupWithInput />
      <ButtonGroupWithText />
      <ButtonGroupWithDropdown />
      <ButtonGroupWithSelect />
      <ButtonGroupWithIcons />
      <ButtonGroupWithInputGroup />
      <ButtonGroupWithFields />
      <ButtonGroupWithLike />
      <ButtonGroupWithSelectAndInput />
      <ButtonGroupNested />
      <ButtonGroupPagination />
      <ButtonGroupPaginationSplit />
      <ButtonGroupNavigation />
      <ButtonGroupTextAlignment />
      <ButtonGroupVertical />
      <ButtonGroupVerticalNested />
    </ExampleWrapper>
  );
}

function ButtonGroupBasic() {
  return (
    <Example title="Basic">
      <div class="flex flex-col gap-4">
        <ButtonGroup>
          <Button variant="outline">Button</Button>
          <Button variant="outline">Another Button</Button>
        </ButtonGroup>
      </div>
    </Example>
  );
}

function ButtonGroupWithInput() {
  return (
    <Example title="With Input">
      <div class="flex flex-col gap-4">
        <ButtonGroup>
          <Button variant="outline">Button</Button>
          <Input placeholder="Type something here..." />
        </ButtonGroup>
        <ButtonGroup>
          <Input placeholder="Type something here..." />
          <Button variant="outline">Button</Button>
        </ButtonGroup>
      </div>
    </Example>
  );
}

function ButtonGroupWithText() {
  return (
    <Example title="With Text">
      <div class="flex flex-col gap-4">
        <ButtonGroup>
          <ButtonGroupText>Text</ButtonGroupText>
          <Button variant="outline">Another Button</Button>
        </ButtonGroup>
        <ButtonGroup>
          <ButtonGroupText>
            <Label for="input-text">GPU Size</Label>
          </ButtonGroupText>
          <Input id="input-text" placeholder="Type something here..." />
        </ButtonGroup>
      </div>
    </Example>
  );
}

function ButtonGroupWithDropdown() {
  return (
    <Example title="With Dropdown">
      <div class="flex flex-col gap-4">
        <ButtonGroup>
          <Button variant="outline">Update</Button>
          <DropdownMenu>
            <DropdownMenuTrigger as={Button} variant="outline" size="icon" class="">
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Disable</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">Uninstall</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline">Follow</Button>
          <DropdownMenu>
            <DropdownMenuTrigger as={Button} variant="outline" size="icon" class="">
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-50">
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <VolumeX />
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
      </div>
    </Example>
  );
}

const currencyItems = [
  { label: "$", value: "$" },
  { label: "€", value: "€" },
  { label: "£", value: "£" },
];

function ButtonGroupWithSelect() {
  return (
    <Example title="With Select">
      <Field>
        <Label for="amount">Amount</Label>
        <ButtonGroup>
          <Select
            options={currencyItems}
            optionValue="value"
            optionTextValue="label"
            defaultValue={currencyItems[0]}
            itemComponent={(props) => (
              <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
            )}
          >
            <SelectTrigger>
              <SelectValue<(typeof currencyItems)[number]>>
                {(state) => state.selectedOption()?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent />
          </Select>
          <Input placeholder="Enter amount to send" />
          <Button variant="outline">
            <ArrowRight />
          </Button>
        </ButtonGroup>
      </Field>
    </Example>
  );
}

function ButtonGroupWithIcons() {
  return (
    <Example title="With Icons">
      <div class="flex flex-col gap-4">
        <ButtonGroup>
          <Button variant="outline">
            <FlipHorizontal />
          </Button>
          <Button variant="outline">
            <FlipVertical />
          </Button>
          <Button variant="outline">
            <RotateCw />
          </Button>
        </ButtonGroup>
      </div>
    </Example>
  );
}

function ButtonGroupWithInputGroup() {
  return (
    <Example title="With Input Group">
      <div class="flex flex-col gap-4">
        <InputGroup>
          <InputGroupInput placeholder="Type to search..." />
          <InputGroupAddon align="inline-start" class="text-muted-foreground">
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </div>
    </Example>
  );
}

function ButtonGroupWithFields() {
  return (
    <Example title="With Fields">
      <FieldGroup class="grid grid-cols-3 gap-4">
        <Field class="col-span-2">
          <Label for="width">Width</Label>
          <ButtonGroup>
            <InputGroup>
              <InputGroupInput id="width" />
              <InputGroupAddon class="text-muted-foreground">W</InputGroupAddon>
              <InputGroupAddon align="inline-end" class="text-muted-foreground">
                px
              </InputGroupAddon>
            </InputGroup>
            <Button variant="outline" size="icon">
              <Minus />
            </Button>
            <Button variant="outline" size="icon">
              <Plus />
            </Button>
          </ButtonGroup>
        </Field>
      </FieldGroup>
    </Example>
  );
}

function ButtonGroupWithLike() {
  return (
    <Example title="With Like">
      <ButtonGroup>
        <Button variant="outline">
          <Heart data-icon="inline-start" /> Like
        </Button>
        <Button as="span" variant="outline" size="icon" class="w-12">
          1.2K
        </Button>
      </ButtonGroup>
    </Example>
  );
}

const durationItems = [
  { label: "Hours", value: "hours" },
  { label: "Days", value: "days" },
  { label: "Weeks", value: "weeks" },
];

function ButtonGroupWithSelectAndInput() {
  return (
    <Example title="With Select and Input">
      <ButtonGroup>
        <Select
          options={durationItems}
          optionValue="value"
          optionTextValue="label"
          defaultValue={durationItems[0]}
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
          )}
        >
          <SelectTrigger id="duration">
            <SelectValue<(typeof durationItems)[number]>>
              {(state) => state.selectedOption()?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
        <Input />
      </ButtonGroup>
    </Example>
  );
}

function ButtonGroupNested() {
  return (
    <Example title="Nested">
      <ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="icon">
            <Plus />
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <InputGroup>
            <InputGroupInput placeholder="Send a message..." />
            <Tooltip>
              <TooltipTrigger as={InputGroupAddon} align="inline-end">
                <AudioLines />
              </TooltipTrigger>
              <TooltipContent>Voice Mode</TooltipContent>
            </Tooltip>
          </InputGroup>
        </ButtonGroup>
      </ButtonGroup>
    </Example>
  );
}

function ButtonGroupPagination() {
  return (
    <Example title="Pagination">
      <ButtonGroup>
        <Button variant="outline" size="sm">
          <ArrowLeft data-icon="inline-start" />
          Previous
        </Button>
        <Button variant="outline" size="sm">
          1
        </Button>
        <Button variant="outline" size="sm">
          2
        </Button>
        <Button variant="outline" size="sm">
          3
        </Button>
        <Button variant="outline" size="sm">
          4
        </Button>
        <Button variant="outline" size="sm">
          5
        </Button>
        <Button variant="outline" size="sm">
          Next
          <ArrowRight data-icon="inline-end" />
        </Button>
      </ButtonGroup>
    </Example>
  );
}

function ButtonGroupPaginationSplit() {
  return (
    <Example title="Pagination Split">
      <ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="sm">
            1
          </Button>
          <Button variant="outline" size="sm">
            2
          </Button>
          <Button variant="outline" size="sm">
            3
          </Button>
          <Button variant="outline" size="sm">
            4
          </Button>
          <Button variant="outline" size="sm">
            5
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="icon-xs">
            <ArrowLeft />
          </Button>
          <Button variant="outline" size="icon-xs">
            <ArrowRight />
          </Button>
        </ButtonGroup>
      </ButtonGroup>
    </Example>
  );
}

function ButtonGroupNavigation() {
  return (
    <Example title="Navigation">
      <ButtonGroup>
        <ButtonGroup>
          <Button variant="outline">
            <ArrowLeft />
          </Button>
          <Button variant="outline">
            <ArrowRight />
          </Button>
        </ButtonGroup>
        <ButtonGroup aria-label="Single navigation button">
          <Button variant="outline" size="icon">
            <ArrowLeft />
          </Button>
        </ButtonGroup>
      </ButtonGroup>
    </Example>
  );
}

function ButtonGroupTextAlignment() {
  return (
    <Example title="Text Alignment">
      <Field>
        <Label id="alignment-label">Text Alignment</Label>
        <ButtonGroup aria-labelledby="alignment-label">
          <Button variant="outline" size="sm">
            Left
          </Button>
          <Button variant="outline" size="sm">
            Center
          </Button>
          <Button variant="outline" size="sm">
            Right
          </Button>
          <Button variant="outline" size="sm">
            Justify
          </Button>
        </ButtonGroup>
      </Field>
    </Example>
  );
}

function ButtonGroupVertical() {
  return (
    <Example title="Vertical">
      <div class="flex gap-6">
        <ButtonGroup orientation="vertical" aria-label="Media controls" class="h-fit">
          <Button variant="outline" size="icon">
            <Plus />
          </Button>
          <Button variant="outline" size="icon">
            <Minus />
          </Button>
        </ButtonGroup>
      </div>
    </Example>
  );
}

function ButtonGroupVerticalNested() {
  return (
    <Example title="Vertical Nested">
      <ButtonGroup orientation="vertical" aria-label="Design tools palette">
        <ButtonGroup orientation="vertical">
          <Button variant="outline" size="icon">
            <Search />
          </Button>
          <Button variant="outline" size="icon">
            <Copy />
          </Button>
          <Button variant="outline" size="icon">
            <Share />
          </Button>
        </ButtonGroup>
        <ButtonGroup orientation="vertical">
          <Button variant="outline" size="icon">
            <FlipHorizontal />
          </Button>
          <Button variant="outline" size="icon">
            <FlipVertical />
          </Button>
          <Button variant="outline" size="icon">
            <RotateCw />
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="icon">
            <Trash />
          </Button>
        </ButtonGroup>
      </ButtonGroup>
    </Example>
  );
}
