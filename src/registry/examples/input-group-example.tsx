import {
  ArrowUp,
  Check,
  ChevronDown,
  Code,
  Copy,
  ExternalLink,
  EyeOff,
  Info,
  Mail,
  Mic,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash,
} from "lucide-solid";
import { createSignal } from "solid-js";
import { toast } from "solid-sonner";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/registry/ui/button-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/registry/ui/field";
import { Input } from "@/registry/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/registry/ui/input-group";
import { Kbd, KbdGroup } from "@/registry/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/ui/popover";
import { Spinner } from "@/registry/ui/spinner";
import { Textarea } from "@/registry/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/ui/tooltip";

export default function InputGroupExample() {
  const [country, setCountry] = createSignal("+1");

  return (
    <ExampleWrapper class="min-w-0">
      <InputGroupBasic />
      <InputGroupWithAddons />
      <InputGroupWithButtons />
      <InputGroupWithTooltip country={country()} setCountry={setCountry} />
      <InputGroupWithKbd />
      <InputGroupInCard />
      <InputGroupTextareaExamples />
    </ExampleWrapper>
  );
}

function InputGroupBasic() {
  return (
    <Example title="Basic">
      <FieldGroup>
        <Field>
          <FieldLabel for="input-default-01">Default (No Input Group)</FieldLabel>
          <Input placeholder="Placeholder" id="input-default-01" />
        </Field>
        <Field>
          <FieldLabel for="input-group-02">Input Group</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-group-02" placeholder="Placeholder" />
          </InputGroup>
        </Field>
        <Field data-disabled="true">
          <FieldLabel for="input-disabled-03">Disabled</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-disabled-03" placeholder="This field is disabled" disabled />
          </InputGroup>
        </Field>
        <Field data-invalid="true">
          <FieldLabel for="input-invalid-04">Invalid</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="input-invalid-04"
              placeholder="This field is invalid"
              aria-invalid="true"
            />
          </InputGroup>
        </Field>
      </FieldGroup>
    </Example>
  );
}

function InputGroupWithAddons() {
  return (
    <Example title="With Addons">
      <FieldGroup>
        <Field>
          <FieldLabel for="input-icon-left-05">Addon (inline-start)</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-icon-left-05" />
            <InputGroupAddon>
              <Search class="text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel for="input-icon-right-07">Addon (inline-end)</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-icon-right-07" />
            <InputGroupAddon align="inline-end">
              <EyeOff />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel for="input-icon-both-09">Addon (inline-start and inline-end)</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-icon-both-09" />
            <InputGroupAddon>
              <Mic class="text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Radio class="animate-pulse text-red-500" />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel for="input-addon-20">Addon (block-start)</FieldLabel>
          <InputGroup class="h-auto">
            <InputGroupInput id="input-addon-20" />
            <InputGroupAddon align="block-start">
              <InputGroupText>First Name</InputGroupText>
              <Info class="ml-auto text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel for="input-addon-21">Addon (block-end)</FieldLabel>
          <InputGroup class="h-auto">
            <InputGroupInput id="input-addon-21" />
            <InputGroupAddon align="block-end">
              <InputGroupText>20/240 characters</InputGroupText>
              <Info class="ml-auto text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel for="input-icon-both-10">Multiple Icons</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-icon-both-10" />
            <InputGroupAddon align="inline-end">
              <Star />
              <InputGroupButton size="icon-xs" onClick={() => toast("Copied to clipboard")}>
                <Copy />
              </InputGroupButton>
            </InputGroupAddon>
            <InputGroupAddon>
              <Radio class="animate-pulse text-red-500" />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel for="input-description-10">Description</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-description-10" />
            <InputGroupAddon align="inline-end">
              <Info />
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>This is a description of the input group.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel for="input-label-10">Label</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <FieldLabel for="input-label-10">Label</FieldLabel>
            </InputGroupAddon>
            <InputGroupInput id="input-label-10" />
          </InputGroup>
          <InputGroup>
            <InputGroupInput id="input-optional-12" aria-label="Optional" />
            <InputGroupAddon align="inline-end">
              <InputGroupText>(optional)</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>
    </Example>
  );
}

function InputGroupWithButtons() {
  return (
    <Example title="With Buttons">
      <FieldGroup>
        <Field>
          <FieldLabel for="input-button-13">Button</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-button-13" />
            <InputGroupAddon>
              <InputGroupButton>Default</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput id="input-button-14" />
            <InputGroupAddon>
              <InputGroupButton variant="outline">Outline</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput id="input-button-15" />
            <InputGroupAddon>
              <InputGroupButton variant="secondary">Secondary</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput id="input-button-16" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton variant="secondary">Button</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput id="input-button-17" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs">
                <Copy />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput id="input-button-18" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton variant="secondary" size="icon-xs">
                <Trash />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>
    </Example>
  );
}

function InputGroupWithTooltip(props: { country: string; setCountry: (value: string) => void }) {
  return (
    <Example title="With Tooltip, Dropdown, Popover">
      <FieldGroup>
        <Field>
          <FieldLabel for="input-tooltip-20">Tooltip</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-tooltip-20" />
            <InputGroupAddon align="inline-end">
              <Tooltip>
                <TooltipTrigger as={InputGroupButton} class="rounded-full" size="icon-xs">
                  <Info />
                </TooltipTrigger>
                <TooltipContent>This is content in a tooltip.</TooltipContent>
              </Tooltip>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>This is a description of the input group.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel for="input-dropdown-21">Dropdown</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-dropdown-21" />
            <InputGroupAddon>
              <DropdownMenu>
                <DropdownMenuTrigger
                  as={InputGroupButton}
                  class="text-muted-foreground tabular-nums"
                >
                  {props.country} <ChevronDown />
                </DropdownMenuTrigger>
                <DropdownMenuContent class="min-w-16">
                  <DropdownMenuItem onSelect={() => props.setCountry("+1")}>+1</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => props.setCountry("+44")}>+44</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => props.setCountry("+46")}>+46</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>This is a description of the input group.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel for="input-secure-19">Popover</FieldLabel>
          <InputGroup>
            <Popover>
              <PopoverTrigger as={InputGroupAddon}>
                <InputGroupButton variant="secondary" size="icon-xs">
                  <Info />
                </InputGroupButton>
              </PopoverTrigger>
              <PopoverContent>
                <PopoverHeader>
                  <PopoverTitle>Your connection is not secure.</PopoverTitle>
                  <PopoverDescription>
                    You should not enter any sensitive information on this site.
                  </PopoverDescription>
                </PopoverHeader>
              </PopoverContent>
            </Popover>
            <InputGroupAddon class="pl-1 text-muted-foreground">https://</InputGroupAddon>
            <InputGroupInput id="input-secure-19" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" onClick={() => toast("Added to favorites")}>
                <Star />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>This is a description of the input group.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel for="url">Button Group</FieldLabel>
          <ButtonGroup>
            <ButtonGroupText>https://</ButtonGroupText>
            <InputGroup>
              <InputGroupInput id="url" />
              <InputGroupAddon align="inline-end">
                <Info />
              </InputGroupAddon>
            </InputGroup>
            <ButtonGroupText>.com</ButtonGroupText>
          </ButtonGroup>
          <FieldDescription>This is a description of the input group.</FieldDescription>
        </Field>
      </FieldGroup>
    </Example>
  );
}

function InputGroupWithKbd() {
  return (
    <Example title="With Kbd">
      <FieldGroup>
        <Field>
          <FieldLabel for="input-kbd-22">Input Group with Kbd</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-kbd-22" />
            <InputGroupAddon>
              <Kbd>⌘K</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput id="input-kbd-23" />
            <InputGroupAddon align="inline-end">
              <Kbd>⌘K</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput id="input-search-apps-24" placeholder="Search for Apps..." />
            <InputGroupAddon align="inline-end">Ask AI</InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Kbd>Tab</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput id="input-search-type-25" placeholder="Type to search..." />
            <InputGroupAddon align="inline-start">
              <Sparkles />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <Kbd>C</Kbd>
              </KbdGroup>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel for="input-username-26">Username</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-username-26" value="shadcn" />
            <InputGroupAddon align="inline-end">
              <div class="flex size-4 items-center justify-center rounded-full bg-green-500 dark:bg-green-800">
                <Check class="size-3 text-white" />
              </div>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription class="text-green-700">This username is available.</FieldDescription>
        </Field>
        <InputGroup>
          <InputGroupInput id="input-search-docs-27" placeholder="Search documentation..." />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
        </InputGroup>
        <InputGroup data-disabled="true">
          <InputGroupInput
            id="input-search-disabled-28"
            placeholder="Search documentation..."
            disabled
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">Disabled</InputGroupAddon>
        </InputGroup>
        <FieldGroup class="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel for="input-group-11">First Name</FieldLabel>
            <InputGroup>
              <InputGroupInput id="input-group-11" placeholder="First Name" />
              <InputGroupAddon align="inline-end">
                <Info />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel for="input-group-12">Last Name</FieldLabel>
            <InputGroup>
              <InputGroupInput id="input-group-12" placeholder="Last Name" />
              <InputGroupAddon align="inline-end">
                <Info />
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </FieldGroup>
        <Field data-disabled="true">
          <FieldLabel for="input-group-29">Loading ("data-disabled="true")</FieldLabel>
          <InputGroup>
            <InputGroupInput id="input-group-29" disabled value="shadcn" />
            <InputGroupAddon align="inline-end">
              <Spinner />
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>This is a description of the input group.</FieldDescription>
        </Field>
      </FieldGroup>
    </Example>
  );
}

function InputGroupInCard() {
  return (
    <Example title="In Card">
      <Card class="w-full">
        <CardHeader>
          <CardTitle>Card with Input Group</CardTitle>
          <CardDescription>This is a card with an input group.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel for="email-input">Email Address</FieldLabel>
              <InputGroup>
                <InputGroupInput id="email-input" type="email" placeholder="you@example.com" />
                <InputGroupAddon align="inline-end">
                  <Mail />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel for="website-input">Website URL</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>https://</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput id="website-input" placeholder="example.com" />
                <InputGroupAddon align="inline-end">
                  <ExternalLink />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel for="feedback-textarea">Feedback &amp; Comments</FieldLabel>
              <InputGroup>
                <InputGroupTextarea
                  id="feedback-textarea"
                  placeholder="Share your thoughts..."
                  class="min-h-[100px]"
                />
                <InputGroupAddon align="block-end">
                  <InputGroupText>0/500 characters</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter class="justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>Submit</Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function InputGroupTextareaExamples() {
  return (
    <Example title="Textarea">
      <FieldGroup>
        <Field>
          <FieldLabel for="textarea-header-footer-12">Default Textarea (No Input Group)</FieldLabel>
          <Textarea id="textarea-header-footer-12" placeholder="Enter your text here..." />
        </Field>
        <Field>
          <FieldLabel for="textarea-header-footer-13">Input Group</FieldLabel>
          <InputGroup>
            <InputGroupTextarea
              id="textarea-header-footer-13"
              placeholder="Enter your text here..."
            />
          </InputGroup>
          <FieldDescription>This is a description of the input group.</FieldDescription>
        </Field>
        <Field data-invalid="true">
          <FieldLabel for="textarea-header-footer-14">Invalid</FieldLabel>
          <InputGroup>
            <InputGroupTextarea
              id="textarea-header-footer-14"
              placeholder="Enter your text here..."
              aria-invalid="true"
            />
          </InputGroup>
          <FieldDescription>This is a description of the input group.</FieldDescription>
        </Field>
        <Field data-disabled="true">
          <FieldLabel for="textarea-header-footer-15">Disabled</FieldLabel>
          <InputGroup>
            <InputGroupTextarea
              id="textarea-header-footer-15"
              placeholder="Enter your text here..."
              disabled
            />
          </InputGroup>
          <FieldDescription>This is a description of the input group.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel for="prompt-31">Addon (block-start)</FieldLabel>
          <InputGroup>
            <InputGroupTextarea id="prompt-31" />
            <InputGroupAddon align="block-start">
              <InputGroupText>Ask, Search or Chat...</InputGroupText>
              <Info class="ml-auto text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>This is a description of the input group.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel for="textarea-header-footer-30">Addon (block-end)</FieldLabel>
          <InputGroup>
            <InputGroupTextarea
              id="textarea-header-footer-30"
              placeholder="Enter your text here..."
            />
            <InputGroupAddon align="block-end">
              <InputGroupText>0/280 characters</InputGroupText>
              <InputGroupButton variant="default" size="icon-xs" class="ml-auto rounded-full">
                <ArrowUp />
                <span class="sr-only">Send</span>
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel for="textarea-comment-31">Addon (Buttons)</FieldLabel>
          <InputGroup>
            <InputGroupTextarea
              id="textarea-comment-31"
              placeholder="Share your thoughts..."
              class="min-h-[120px]"
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton variant="ghost" class="ml-auto" size="sm">
                Cancel
              </InputGroupButton>
              <InputGroupButton variant="default" size="sm">
                Post Comment
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel for="textarea-code-32">Code Editor</FieldLabel>
          <InputGroup>
            <InputGroupTextarea
              id="textarea-code-32"
              placeholder="console.log('Hello, world!');"
              class="min-h-[300px] py-3"
            />
            <InputGroupAddon align="block-start" class="border-b">
              <InputGroupText class="font-medium font-mono">
                <Code />
                script.js
              </InputGroupText>
              <InputGroupButton size="icon-xs" class="ml-auto">
                <RefreshCw />
              </InputGroupButton>
              <InputGroupButton size="icon-xs" variant="ghost">
                <Copy />
              </InputGroupButton>
            </InputGroupAddon>
            <InputGroupAddon align="block-end" class="border-t">
              <InputGroupText>Line 1, Column 1</InputGroupText>
              <InputGroupText class="ml-auto">JavaScript</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>
    </Example>
  );
}
