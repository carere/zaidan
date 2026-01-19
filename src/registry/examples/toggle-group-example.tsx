import {
  ArrowDown,
  ArrowUp,
  Bold,
  Bookmark,
  Heart,
  Italic,
  Star,
  TrendingUp,
  Underline,
} from "lucide-solid";
import { Example, ExampleWrapper } from "@/components/example";
import { Input } from "@/registry/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/registry/ui/toggle-group";

export default function ToggleGroupExample() {
  return (
    <ExampleWrapper>
      <ToggleGroupBasic />
      <ToggleGroupOutline />
      <ToggleGroupOutlineWithIcons />
      <ToggleGroupSizes />
      <ToggleGroupSpacing />
      <ToggleGroupWithIcons />
      <ToggleGroupFilter />
      <ToggleGroupDateRange />
      <ToggleGroupSort />
      <ToggleGroupWithInputAndSelect />
      <ToggleGroupVertical />
      <ToggleGroupVerticalOutline />
      <ToggleGroupVerticalOutlineWithIcons />
      <ToggleGroupVerticalWithSpacing />
    </ExampleWrapper>
  );
}

function ToggleGroupBasic() {
  return (
    <Example title="Basic">
      <ToggleGroup multiple spacing={1}>
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <Bold />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <Italic />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <Underline />
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupOutline() {
  return (
    <Example title="Outline">
      <ToggleGroup multiple={false} variant="outline" defaultValue="all">
        <ToggleGroupItem value="all" aria-label="Toggle all">
          All
        </ToggleGroupItem>
        <ToggleGroupItem value="missed" aria-label="Toggle missed">
          Missed
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupOutlineWithIcons() {
  return (
    <Example title="Outline With Icons">
      <ToggleGroup variant="outline" multiple size="sm">
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <Bold />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <Italic />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <Underline />
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupSizes() {
  return (
    <Example title="Sizes">
      <div class="flex flex-col gap-4">
        <ToggleGroup multiple={false} size="sm" defaultValue="top" variant="outline">
          <ToggleGroupItem value="top" aria-label="Toggle top">
            Top
          </ToggleGroupItem>
          <ToggleGroupItem value="bottom" aria-label="Toggle bottom">
            Bottom
          </ToggleGroupItem>
          <ToggleGroupItem value="left" aria-label="Toggle left">
            Left
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Toggle right">
            Right
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup multiple={false} defaultValue="top" variant="outline">
          <ToggleGroupItem value="top" aria-label="Toggle top">
            Top
          </ToggleGroupItem>
          <ToggleGroupItem value="bottom" aria-label="Toggle bottom">
            Bottom
          </ToggleGroupItem>
          <ToggleGroupItem value="left" aria-label="Toggle left">
            Left
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Toggle right">
            Right
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </Example>
  );
}

function ToggleGroupSpacing() {
  return (
    <Example title="With Spacing">
      <ToggleGroup multiple={false} size="sm" defaultValue="top" variant="outline" spacing={2}>
        <ToggleGroupItem value="top" aria-label="Toggle top">
          Top
        </ToggleGroupItem>
        <ToggleGroupItem value="bottom" aria-label="Toggle bottom">
          Bottom
        </ToggleGroupItem>
        <ToggleGroupItem value="left" aria-label="Toggle left">
          Left
        </ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Toggle right">
          Right
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupWithIcons() {
  return (
    <Example title="With Icons">
      <ToggleGroup multiple variant="outline" spacing={2} size="sm">
        <ToggleGroupItem
          value="star"
          aria-label="Toggle star"
          class="aria-pressed:bg-transparent aria-pressed:*:[svg]:fill-foreground aria-pressed:*:[svg]:stroke-foreground"
        >
          <Star />
          Star
        </ToggleGroupItem>
        <ToggleGroupItem
          value="heart"
          aria-label="Toggle heart"
          class="aria-pressed:bg-transparent aria-pressed:*:[svg]:fill-foreground aria-pressed:*:[svg]:stroke-foreground"
        >
          <Heart />
          Heart
        </ToggleGroupItem>
        <ToggleGroupItem
          value="bookmark"
          aria-label="Toggle bookmark"
          class="aria-pressed:bg-transparent aria-pressed:*:[svg]:fill-foreground aria-pressed:*:[svg]:stroke-foreground"
        >
          <Bookmark />
          Bookmark
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupFilter() {
  return (
    <Example title="Filter">
      <ToggleGroup multiple={false} defaultValue="all" variant="outline" size="sm">
        <ToggleGroupItem value="all" aria-label="All">
          All
        </ToggleGroupItem>
        <ToggleGroupItem value="active" aria-label="Active">
          Active
        </ToggleGroupItem>
        <ToggleGroupItem value="completed" aria-label="Completed">
          Completed
        </ToggleGroupItem>
        <ToggleGroupItem value="archived" aria-label="Archived">
          Archived
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupDateRange() {
  return (
    <Example title="Date Range">
      <ToggleGroup multiple={false} defaultValue="today" variant="outline" size="sm" spacing={2}>
        <ToggleGroupItem value="today" aria-label="Today">
          Today
        </ToggleGroupItem>
        <ToggleGroupItem value="week" aria-label="This Week">
          This Week
        </ToggleGroupItem>
        <ToggleGroupItem value="month" aria-label="This Month">
          This Month
        </ToggleGroupItem>
        <ToggleGroupItem value="year" aria-label="This Year">
          This Year
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupSort() {
  return (
    <Example title="Sort">
      <ToggleGroup multiple={false} defaultValue="newest" variant="outline" size="sm">
        <ToggleGroupItem value="newest" aria-label="Newest">
          <ArrowDown />
          Newest
        </ToggleGroupItem>
        <ToggleGroupItem value="oldest" aria-label="Oldest">
          <ArrowUp />
          Oldest
        </ToggleGroupItem>
        <ToggleGroupItem value="popular" aria-label="Popular">
          <TrendingUp />
          Popular
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupWithInputAndSelect() {
  const items = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Archived", value: "archived" },
  ];
  return (
    <Example title="With Input and Select">
      <div class="flex items-center gap-2">
        <Input type="search" placeholder="Search..." class="flex-1" />
        <Select
          options={items}
          optionValue="value"
          optionTextValue="label"
          defaultValue={items[0]}
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
          )}
        >
          <SelectTrigger class="w-32">
            <SelectValue<(typeof items)[number]>>
              {(state) => state.selectedOption().label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup />
          </SelectContent>
        </Select>
        <ToggleGroup multiple={false} defaultValue="grid" variant="outline">
          <ToggleGroupItem value="grid" aria-label="Grid view">
            Grid
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            List
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </Example>
  );
}

function ToggleGroupVertical() {
  return (
    <Example title="Vertical">
      <ToggleGroup multiple orientation="vertical" spacing={1}>
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <Bold />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <Italic />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <Underline />
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupVerticalOutline() {
  return (
    <Example title="Vertical Outline">
      <ToggleGroup
        multiple={false}
        variant="outline"
        defaultValue="all"
        orientation="vertical"
        size="sm"
      >
        <ToggleGroupItem value="all" aria-label="Toggle all">
          All
        </ToggleGroupItem>
        <ToggleGroupItem value="active" aria-label="Toggle active">
          Active
        </ToggleGroupItem>
        <ToggleGroupItem value="completed" aria-label="Toggle completed">
          Completed
        </ToggleGroupItem>
        <ToggleGroupItem value="archived" aria-label="Toggle archived">
          Archived
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupVerticalOutlineWithIcons() {
  return (
    <Example title="Vertical Outline With Icons">
      <ToggleGroup variant="outline" multiple orientation="vertical" size="sm">
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <Bold />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <Italic />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <Underline />
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}

function ToggleGroupVerticalWithSpacing() {
  return (
    <Example title="Vertical With Spacing">
      <ToggleGroup
        multiple={false}
        size="sm"
        defaultValue="top"
        variant="outline"
        orientation="vertical"
        spacing={1}
      >
        <ToggleGroupItem value="top" aria-label="Toggle top">
          Top
        </ToggleGroupItem>
        <ToggleGroupItem value="bottom" aria-label="Toggle bottom">
          Bottom
        </ToggleGroupItem>
        <ToggleGroupItem value="left" aria-label="Toggle left">
          Left
        </ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Toggle right">
          Right
        </ToggleGroupItem>
      </ToggleGroup>
    </Example>
  );
}
