import { ArrowUp, Code, Copy, EyeOff, Info, Mail, RefreshCw, Search, Star } from "lucide-solid";

import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card";
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
import { Label } from "@/registry/ui/label";
import { Spinner } from "@/registry/ui/spinner";
import { Textarea } from "@/registry/ui/textarea";

export default function InputGroupExample() {
  return (
    <ExampleWrapper class="min-w-0">
      <InputGroupBasic />
      <InputGroupWithAddons />
      <InputGroupWithButtons />
      <InputGroupWithKbd />
      <InputGroupInCard />
      <InputGroupTextareaExamples />
    </ExampleWrapper>
  );
}

function InputGroupBasic() {
  return (
    <Example title="Basic">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <Label for="input-default-01">Default (No Input Group)</Label>
          <Input placeholder="Placeholder" id="input-default-01" />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="input-group-02">Input Group</Label>
          <InputGroup>
            <InputGroupInput id="input-group-02" placeholder="Placeholder" />
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2" data-disabled="true">
          <Label for="input-disabled-03">Disabled</Label>
          <InputGroup>
            <InputGroupInput id="input-disabled-03" placeholder="This field is disabled" disabled />
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2" data-invalid="true">
          <Label for="input-invalid-04">Invalid</Label>
          <InputGroup>
            <InputGroupInput
              id="input-invalid-04"
              placeholder="This field is invalid"
              aria-invalid="true"
            />
          </InputGroup>
        </div>
      </div>
    </Example>
  );
}

function InputGroupWithAddons() {
  return (
    <Example title="With Addons">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <Label for="input-icon-left-05">Addon (inline-start)</Label>
          <InputGroup>
            <InputGroupInput id="input-icon-left-05" />
            <InputGroupAddon>
              <Search class="size-4 text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="input-icon-right-07">Addon (inline-end)</Label>
          <InputGroup>
            <InputGroupInput id="input-icon-right-07" />
            <InputGroupAddon align="inline-end">
              <EyeOff class="size-4" />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="input-icon-both-09">Addon (inline-start and inline-end)</Label>
          <InputGroup>
            <InputGroupInput id="input-icon-both-09" />
            <InputGroupAddon>
              <Mail class="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Info class="size-4" />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="input-addon-20">Addon (block-start)</Label>
          <InputGroup class="h-auto">
            <InputGroupInput id="input-addon-20" />
            <InputGroupAddon align="block-start">
              <InputGroupText>First Name</InputGroupText>
              <Info class="ml-auto size-4 text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="input-addon-21">Addon (block-end)</Label>
          <InputGroup class="h-auto">
            <InputGroupInput id="input-addon-21" />
            <InputGroupAddon align="block-end">
              <InputGroupText>20/240 characters</InputGroupText>
              <Info class="ml-auto size-4 text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="input-icon-both-10">Multiple Icons</Label>
          <InputGroup>
            <InputGroupInput id="input-icon-both-10" />
            <InputGroupAddon align="inline-end">
              <Star class="size-4" />
              <InputGroupButton size="icon-xs">
                <Copy class="size-4" />
              </InputGroupButton>
            </InputGroupAddon>
            <InputGroupAddon>
              <Mail class="size-4 text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="input-label-10">Label</Label>
          <InputGroup>
            <InputGroupAddon>
              <Label for="input-label-10">Label</Label>
            </InputGroupAddon>
            <InputGroupInput id="input-label-10" />
          </InputGroup>
          <InputGroup>
            <InputGroupInput id="input-optional-12" aria-label="Optional" />
            <InputGroupAddon align="inline-end">
              <InputGroupText>(optional)</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </Example>
  );
}

function InputGroupWithButtons() {
  return (
    <Example title="With Buttons">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <Label for="input-button-13">Button</Label>
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
                <Copy class="size-4" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </Example>
  );
}

function InputGroupWithKbd() {
  return (
    <Example title="With Kbd">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <Label for="input-kbd-22">Input Group with Kbd</Label>
          <InputGroup>
            <InputGroupInput id="input-kbd-22" />
            <InputGroupAddon>
              <Kbd>&#8984;K</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupInput id="input-kbd-23" />
            <InputGroupAddon align="inline-end">
              <Kbd>&#8984;K</Kbd>
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
              <Star class="size-4" />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <Kbd>C</Kbd>
              </KbdGroup>
            </InputGroupAddon>
          </InputGroup>
        </div>
        <InputGroup>
          <InputGroupInput id="input-search-docs-27" placeholder="Search documentation..." />
          <InputGroupAddon>
            <Search class="size-4" />
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
            <Search class="size-4" />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">Disabled</InputGroupAddon>
        </InputGroup>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <Label for="input-group-11">First Name</Label>
            <InputGroup>
              <InputGroupInput id="input-group-11" placeholder="First Name" />
              <InputGroupAddon align="inline-end">
                <Info class="size-4" />
              </InputGroupAddon>
            </InputGroup>
          </div>
          <div class="flex flex-col gap-2">
            <Label for="input-group-12">Last Name</Label>
            <InputGroup>
              <InputGroupInput id="input-group-12" placeholder="Last Name" />
              <InputGroupAddon align="inline-end">
                <Info class="size-4" />
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
        <div class="flex flex-col gap-2" data-disabled="true">
          <Label for="input-group-29">Loading ("data-disabled="true")</Label>
          <InputGroup>
            <InputGroupInput id="input-group-29" disabled value="shadcn" />
            <InputGroupAddon align="inline-end">
              <Spinner />
            </InputGroupAddon>
          </InputGroup>
          <p class="text-muted-foreground text-sm">This is a description of the input group.</p>
        </div>
      </div>
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
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <Label for="email-input">Email Address</Label>
              <InputGroup>
                <InputGroupInput id="email-input" type="email" placeholder="you@example.com" />
                <InputGroupAddon align="inline-end">
                  <Mail class="size-4" />
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div class="flex flex-col gap-2">
              <Label for="website-input">Website URL</Label>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>https://</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput id="website-input" placeholder="example.com" />
                <InputGroupAddon align="inline-end">
                  <Info class="size-4" />
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div class="flex flex-col gap-2">
              <Label for="feedback-textarea">Feedback & Comments</Label>
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
            </div>
          </div>
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
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <Label for="textarea-header-footer-12">Default Textarea (No Input Group)</Label>
          <Textarea id="textarea-header-footer-12" placeholder="Enter your text here..." />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="textarea-header-footer-13">Input Group</Label>
          <InputGroup>
            <InputGroupTextarea
              id="textarea-header-footer-13"
              placeholder="Enter your text here..."
            />
          </InputGroup>
          <p class="text-muted-foreground text-sm">This is a description of the input group.</p>
        </div>
        <div class="flex flex-col gap-2" data-invalid="true">
          <Label for="textarea-header-footer-14">Invalid</Label>
          <InputGroup>
            <InputGroupTextarea
              id="textarea-header-footer-14"
              placeholder="Enter your text here..."
              aria-invalid="true"
            />
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2" data-disabled="true">
          <Label for="textarea-header-footer-15">Disabled</Label>
          <InputGroup>
            <InputGroupTextarea
              id="textarea-header-footer-15"
              placeholder="Enter your text here..."
              disabled
            />
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="prompt-31">Addon (block-start)</Label>
          <InputGroup>
            <InputGroupTextarea id="prompt-31" />
            <InputGroupAddon align="block-start">
              <InputGroupText>Ask, Search or Chat...</InputGroupText>
              <Info class="ml-auto size-4 text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="textarea-header-footer-30">Addon (block-end)</Label>
          <InputGroup>
            <InputGroupTextarea
              id="textarea-header-footer-30"
              placeholder="Enter your text here..."
            />
            <InputGroupAddon align="block-end">
              <InputGroupText>0/280 characters</InputGroupText>
              <InputGroupButton variant="default" size="icon-xs" class="ml-auto rounded-full">
                <ArrowUp class="size-4" />
                <span class="sr-only">Send</span>
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="textarea-comment-31">Addon (Buttons)</Label>
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
        </div>
        <div class="flex flex-col gap-2">
          <Label for="textarea-code-32">Code Editor</Label>
          <InputGroup>
            <InputGroupTextarea
              id="textarea-code-32"
              placeholder="console.log('Hello, world!');"
              class="min-h-[300px] py-3"
            />
            <InputGroupAddon align="block-start" class="border-b">
              <InputGroupText class="font-medium font-mono">
                <Code class="size-4" />
                script.js
              </InputGroupText>
              <InputGroupButton size="icon-xs" class="ml-auto">
                <RefreshCw class="size-4" />
              </InputGroupButton>
              <InputGroupButton size="icon-xs" variant="ghost">
                <Copy class="size-4" />
              </InputGroupButton>
            </InputGroupAddon>
            <InputGroupAddon align="block-end" class="border-t">
              <InputGroupText>Line 1, Column 1</InputGroupText>
              <InputGroupText class="ml-auto">JavaScript</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </Example>
  );
}
