import { Bold, Bookmark, Italic, Underline } from "lucide-solid";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import { Toggle } from "@/registry/kobalte/ui/toggle";

export default function ToggleExample() {
  return (
    <ExampleWrapper>
      <ToggleBasic />
      <ToggleOutline />
      <ToggleSizes />
      <ToggleWithButtonText />
      <ToggleWithButtonIcon />
      <ToggleWithButtonIconText />
      <ToggleDisabled />
      <ToggleWithIcon />
    </ExampleWrapper>
  );
}

function ToggleBasic() {
  return (
    <Example title="Basic">
      <div class="flex flex-wrap items-center gap-2">
        <Toggle aria-label="Toggle bold" defaultPressed>
          <Bold />
        </Toggle>
        <Toggle aria-label="Toggle italic">
          <Italic />
        </Toggle>
        <Toggle aria-label="Toggle underline">
          <Underline />
        </Toggle>
      </div>
    </Example>
  );
}

function ToggleOutline() {
  return (
    <Example title="Outline">
      <div class="flex flex-wrap items-center gap-2">
        <Toggle variant="outline" aria-label="Toggle italic">
          <Italic />
          Italic
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle bold">
          <Bold />
          Bold
        </Toggle>
      </div>
    </Example>
  );
}

function ToggleSizes() {
  return (
    <Example title="Sizes">
      <div class="flex flex-wrap items-center gap-2">
        <Toggle variant="outline" aria-label="Toggle small" size="sm">
          Small
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle default" size="default">
          Default
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle large" size="lg">
          Large
        </Toggle>
      </div>
    </Example>
  );
}

function ToggleWithButtonText() {
  return (
    <Example title="With Button Text">
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline">
            Button
          </Button>
          <Toggle variant="outline" aria-label="Toggle sm" size="sm">
            Toggle
          </Toggle>
        </div>
        <div class="flex items-center gap-2">
          <Button size="default" variant="outline">
            Button
          </Button>
          <Toggle variant="outline" aria-label="Toggle default" size="default">
            Toggle
          </Toggle>
        </div>
        <div class="flex items-center gap-2">
          <Button size="lg" variant="outline">
            Button
          </Button>
          <Toggle variant="outline" aria-label="Toggle lg" size="lg">
            Toggle
          </Toggle>
        </div>
      </div>
    </Example>
  );
}

function ToggleWithButtonIcon() {
  return (
    <Example title="With Button Icon">
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon-sm">
            <Bold />
          </Button>
          <Toggle variant="outline" aria-label="Toggle sm icon" size="sm">
            <Bold />
          </Toggle>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Italic />
          </Button>
          <Toggle variant="outline" aria-label="Toggle default icon" size="default">
            <Italic />
          </Toggle>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon-lg">
            <Underline />
          </Button>
          <Toggle variant="outline" aria-label="Toggle lg icon" size="lg">
            <Underline />
          </Toggle>
        </div>
      </div>
    </Example>
  );
}

function ToggleWithButtonIconText() {
  return (
    <Example title="With Button Icon + Text">
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Bold data-icon="inline-start" />
            Button
          </Button>
          <Toggle variant="outline" aria-label="Toggle sm icon text" size="sm">
            <Bold />
            Toggle
          </Toggle>
        </div>
        <div class="flex items-center gap-2">
          <Button size="default" variant="outline">
            <Italic data-icon="inline-start" />
            Button
          </Button>
          <Toggle variant="outline" aria-label="Toggle default icon text" size="default">
            <Italic />
            Toggle
          </Toggle>
        </div>
        <div class="flex items-center gap-2">
          <Button size="lg" variant="outline">
            <Underline data-icon="inline-start" />
            Button
          </Button>
          <Toggle variant="outline" aria-label="Toggle lg icon text" size="lg">
            <Underline />
            Toggle
          </Toggle>
        </div>
      </div>
    </Example>
  );
}

function ToggleDisabled() {
  return (
    <Example title="Disabled">
      <div class="flex flex-wrap items-center gap-2">
        <Toggle aria-label="Toggle disabled" disabled>
          Disabled
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle disabled outline" disabled>
          Disabled
        </Toggle>
      </div>
    </Example>
  );
}

function ToggleWithIcon() {
  return (
    <Example title="With Icon">
      <div class="flex flex-wrap items-center gap-2">
        <Toggle aria-label="Toggle bookmark" defaultPressed>
          <Bookmark class="group-data-[pressed]/toggle:fill-accent-foreground" />
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle bookmark outline">
          <Bookmark class="group-data-[pressed]/toggle:fill-accent-foreground" />
          Bookmark
        </Toggle>
      </div>
    </Example>
  );
}
