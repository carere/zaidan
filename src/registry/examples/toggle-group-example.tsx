import { Bold, BookmarkIcon, HeartIcon, Italic, StarIcon, Underline } from "lucide-solid";
import { Example, ExampleWrapper } from "@/components/example";
import { ToggleGroup, ToggleGroupItem } from "@/registry/ui/toggle-group";

export default function ToggleGroupExample() {
  return (
    <ExampleWrapper>
      <ToggleGroupDefaultExample />
      <ToggleGroupOutlineExample />
      <ToggleGroupSingleExample />
      <ToggleGroupSmExample />
      <ToggleGroupLgExample />
      <ToggleGroupDisabledExample />
      <ToggleGroupSpacingExample />
    </ExampleWrapper>
  );
}

function ToggleGroupDefaultExample() {
  return (
    <Example title="Default">
      <ToggleGroup multiple defaultValue={["bold"]}>
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <Bold class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <Italic class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <Underline class="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupOutlineExample() {
  return (
    <Example title="Outline Variant">
      <ToggleGroup multiple variant="outline" defaultValue={["bold"]}>
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <Bold class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <Italic class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <Underline class="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupSingleExample() {
  return (
    <Example title="Single Selection">
      <ToggleGroup defaultValue="bold">
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <Bold class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <Italic class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <Underline class="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupSmExample() {
  return (
    <Example title="Small Size">
      <ToggleGroup size="sm" defaultValue="bold">
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <Bold class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <Italic class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <Underline class="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupLgExample() {
  return (
    <Example title="Large Size">
      <ToggleGroup multiple size="lg" defaultValue={["bold"]}>
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <Bold class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <Italic class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <Underline class="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupDisabledExample() {
  return (
    <Example title="Disabled">
      <ToggleGroup multiple disabled defaultValue={["bold"]}>
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <Bold class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <Italic class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <Underline class="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupSpacingExample() {
  return (
    <Example title="With Spacing">
      <ToggleGroup multiple variant="outline" spacing={2} size="sm" defaultValue={["star"]}>
        <ToggleGroupItem
          value="star"
          aria-label="Toggle star"
          class="data-[pressed]:bg-transparent data-[pressed]:*:[svg]:fill-yellow-500 data-[pressed]:*:[svg]:stroke-yellow-500"
        >
          <StarIcon />
          Star
        </ToggleGroupItem>
        <ToggleGroupItem
          value="heart"
          aria-label="Toggle heart"
          class="data-[pressed]:bg-transparent data-[pressed]:*:[svg]:fill-red-500 data-[pressed]:*:[svg]:stroke-red-500"
        >
          <HeartIcon />
          Heart
        </ToggleGroupItem>
        <ToggleGroupItem
          value="bookmark"
          aria-label="Toggle bookmark"
          class="data-[pressed]:bg-transparent data-[pressed]:*:[svg]:fill-blue-500 data-[pressed]:*:[svg]:stroke-blue-500"
        >
          <BookmarkIcon />
          Bookmark
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}
