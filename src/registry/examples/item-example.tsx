/** biome-ignore-all lint/a11y/useValidAnchor: <example file> */
import { Archive, ChevronRight, Mail, MoreHorizontal, Star, Trash2 } from "lucide-solid";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/registry/ui/item";

export default function ItemExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1">
      <DefaultVariantItems />
      <OutlineVariantItems />
      <MutedVariantItems />
      <ItemSizes />
      <ItemsWithMedia />
      <ItemGroupExample />
      <ItemHeaderFooterExample />
    </ExampleWrapper>
  );
}

function DefaultVariantItems() {
  return (
    <Example title="Default Variant">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Item>
          <ItemContent>
            <ItemTitle>Title Only</ItemTitle>
          </ItemContent>
        </Item>
        <Item>
          <ItemContent>
            <ItemTitle>Title + Description</ItemTitle>
            <ItemDescription>
              This is a description that provides additional context.
            </ItemDescription>
          </ItemContent>
        </Item>
        <Item>
          <ItemContent>
            <ItemTitle>Title + Description + Action</ItemTitle>
            <ItemDescription>
              This item includes a title, description, and action button.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="outline" size="sm">
              Action
            </Button>
          </ItemActions>
        </Item>
        <Item>
          <ItemContent>
            <ItemTitle>Multiple Actions</ItemTitle>
            <ItemDescription>
              Item with multiple action buttons in the actions area.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
            <Button size="sm">Confirm</Button>
          </ItemActions>
        </Item>
      </div>
    </Example>
  );
}

function OutlineVariantItems() {
  return (
    <Example title="Outline Variant">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>Title Only</ItemTitle>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>Title + Description</ItemTitle>
            <ItemDescription>
              This is a description that provides additional context.
            </ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>Title + Description + Action</ItemTitle>
            <ItemDescription>
              This item includes a title, description, and action button.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="outline" size="sm">
              Action
            </Button>
          </ItemActions>
        </Item>
      </div>
    </Example>
  );
}

function MutedVariantItems() {
  return (
    <Example title="Muted Variant">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Item variant="muted">
          <ItemContent>
            <ItemTitle>Title Only</ItemTitle>
          </ItemContent>
        </Item>
        <Item variant="muted">
          <ItemContent>
            <ItemTitle>Title + Description</ItemTitle>
            <ItemDescription>
              This is a description that provides additional context.
            </ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="muted">
          <ItemContent>
            <ItemTitle>Title + Description + Action</ItemTitle>
            <ItemDescription>
              This item includes a title, description, and action button.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="outline" size="sm">
              Action
            </Button>
          </ItemActions>
        </Item>
      </div>
    </Example>
  );
}

function ItemSizes() {
  return (
    <Example title="Sizes">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Item size="default">
          <ItemMedia variant="icon">
            <Mail />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Default Size</ItemTitle>
            <ItemDescription>Standard item size for most use cases.</ItemDescription>
          </ItemContent>
        </Item>
        <Item size="sm">
          <ItemMedia variant="icon">
            <Mail />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Small Size</ItemTitle>
            <ItemDescription>Compact item for dense lists.</ItemDescription>
          </ItemContent>
        </Item>
        <Item size="xs">
          <ItemMedia variant="icon">
            <Mail />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Extra Small Size</ItemTitle>
            <ItemDescription>Minimal item for tight spaces.</ItemDescription>
          </ItemContent>
        </Item>
      </div>
    </Example>
  );
}

function ItemsWithMedia() {
  return (
    <Example title="With Media">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Item variant="outline">
          <ItemMedia variant="icon">
            <Archive />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Media + Title</ItemTitle>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemMedia variant="icon">
            <Star />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Media + Title + Description</ItemTitle>
            <ItemDescription>This item includes media, title, and description.</ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemMedia variant="icon">
            <Mail />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Media + Title + Description + Action</ItemTitle>
            <ItemDescription>
              Complete item with all components: media, title, description, and button.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button size="sm">Action</Button>
          </ItemActions>
        </Item>
        <Item variant="outline">
          <ItemMedia variant="image">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=faces"
              alt="User avatar"
              class="size-10 rounded-full object-cover"
            />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Image Media</ItemTitle>
            <ItemDescription>Using image variant for avatars or thumbnails.</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal />
            </Button>
          </ItemActions>
        </Item>
      </div>
    </Example>
  );
}

function ItemGroupExample() {
  return (
    <Example title="Item Group">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <ItemGroup>
          <Item variant="outline">
            <ItemMedia variant="icon">
              <Mail />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Inbox</ItemTitle>
              <ItemDescription>View your incoming messages</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRight class="text-muted-foreground" />
            </ItemActions>
          </Item>
          <ItemSeparator />
          <Item variant="outline">
            <ItemMedia variant="icon">
              <Star />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Starred</ItemTitle>
              <ItemDescription>Your favorite items</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRight class="text-muted-foreground" />
            </ItemActions>
          </Item>
          <ItemSeparator />
          <Item variant="outline">
            <ItemMedia variant="icon">
              <Archive />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Archive</ItemTitle>
              <ItemDescription>Archived items</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRight class="text-muted-foreground" />
            </ItemActions>
          </Item>
          <ItemSeparator />
          <Item variant="outline">
            <ItemMedia variant="icon">
              <Trash2 />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Trash</ItemTitle>
              <ItemDescription>Deleted items</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRight class="text-muted-foreground" />
            </ItemActions>
          </Item>
        </ItemGroup>
      </div>
    </Example>
  );
}

function ItemHeaderFooterExample() {
  return (
    <Example title="Header & Footer">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Item variant="outline">
          <ItemHeader>
            <ItemTitle>Header Title</ItemTitle>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal />
            </Button>
          </ItemHeader>
          <ItemContent>
            <ItemDescription>
              This item uses ItemHeader for a title with action button alignment.
            </ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>With Footer</ItemTitle>
            <ItemDescription>
              This item includes a footer section below the content.
            </ItemDescription>
          </ItemContent>
          <ItemFooter>
            <span class="text-muted-foreground text-sm">Updated 2 hours ago</span>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </ItemFooter>
        </Item>
        <Item variant="outline">
          <ItemHeader>
            <ItemTitle>Header + Footer</ItemTitle>
            <Button variant="ghost" size="icon-xs">
              <Star />
            </Button>
          </ItemHeader>
          <ItemMedia variant="icon">
            <Mail />
          </ItemMedia>
          <ItemContent>
            <ItemDescription>
              Complete item with header, media, content, and footer sections.
            </ItemDescription>
          </ItemContent>
          <ItemFooter>
            <span class="text-muted-foreground text-sm">Last week</span>
            <div class="flex gap-2">
              <Button variant="outline" size="sm">
                Archive
              </Button>
              <Button size="sm">Reply</Button>
            </div>
          </ItemFooter>
        </Item>
      </div>
    </Example>
  );
}
