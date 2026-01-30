import { Example, ExampleWrapper } from "@/components/example";
import { Separator } from "@/registry/kobalte/ui/separator";

export default function SeparatorExample() {
  return (
    <ExampleWrapper>
      <SeparatorHorizontal />
      <SeparatorVertical />
      <SeparatorVerticalMenu />
      <SeparatorInList />
    </ExampleWrapper>
  );
}

function SeparatorHorizontal() {
  return (
    <Example title="Horizontal">
      <div class="flex flex-col gap-4 style-lyra:text-xs/relaxed text-sm">
        <div class="flex flex-col gap-1">
          <div class="font-medium leading-none">shadcn/ui</div>
          <div class="text-muted-foreground">The Foundation for your Design System</div>
        </div>
        <Separator />
        <div>
          A set of beautifully designed components that you can customize, extend, and build on.
        </div>
      </div>
    </Example>
  );
}

function SeparatorVertical() {
  return (
    <Example title="Vertical">
      <div class="flex h-5 items-center gap-4 style-lyra:text-xs/relaxed text-sm">
        <div>Blog</div>
        <Separator orientation="vertical" />
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
      </div>
    </Example>
  );
}

function SeparatorVerticalMenu() {
  return (
    <Example title="Vertical Menu">
      <div class="flex items-center gap-2 style-lyra:text-xs/relaxed text-sm md:gap-4">
        <div class="flex flex-col gap-1">
          <span class="font-medium">Settings</span>
          <span class="text-muted-foreground text-xs">Manage preferences</span>
        </div>
        <Separator orientation="vertical" />
        <div class="flex flex-col gap-1">
          <span class="font-medium">Account</span>
          <span class="text-muted-foreground text-xs">Profile & security</span>
        </div>
        <Separator orientation="vertical" />
        <div class="flex flex-col gap-1">
          <span class="font-medium">Help</span>
          <span class="text-muted-foreground text-xs">Support & docs</span>
        </div>
      </div>
    </Example>
  );
}

function SeparatorInList() {
  return (
    <Example title="In List">
      <div class="flex flex-col gap-2 style-lyra:text-xs/relaxed text-sm">
        <dl class="flex items-center justify-between">
          <dt>Item 1</dt>
          <dd class="text-muted-foreground">Value 1</dd>
        </dl>
        <Separator />
        <dl class="flex items-center justify-between">
          <dt>Item 2</dt>
          <dd class="text-muted-foreground">Value 2</dd>
        </dl>
        <Separator />
        <dl class="flex items-center justify-between">
          <dt>Item 3</dt>
          <dd class="text-muted-foreground">Value 3</dd>
        </dl>
      </div>
    </Example>
  );
}
