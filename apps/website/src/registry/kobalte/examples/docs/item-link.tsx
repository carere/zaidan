import { ChevronRight, ExternalLink } from "lucide-solid";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/registry/kobalte/ui/item";

export default function ItemLink() {
  return (
    <div class="flex w-full max-w-md flex-col gap-4">
      <Item as="a" href="#item-link">
        <ItemContent>
          <ItemTitle>Visit our documentation</ItemTitle>
          <ItemDescription>Learn how to get started with our components.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <ChevronRight class="size-4" />
        </ItemActions>
      </Item>
      <Item
        as="a"
        href="https://zaidan.dev"
        target="_blank"
        rel="noopener noreferrer"
        variant="outline"
      >
        <ItemContent>
          <ItemTitle>External resource</ItemTitle>
          <ItemDescription>Opens in a new tab with security attributes.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <ExternalLink class="size-4" />
        </ItemActions>
      </Item>
    </div>
  );
}
