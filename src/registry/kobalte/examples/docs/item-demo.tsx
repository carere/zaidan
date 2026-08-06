import { BadgeCheck, ChevronRight } from "lucide-solid";

import { Button } from "@/registry/kobalte/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/registry/kobalte/ui/item";

export default function ItemDemo() {
  return (
    <div class="flex w-full max-w-md flex-col gap-6">
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Basic Item</ItemTitle>
          <ItemDescription>A simple item with title and description.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm">
            Action
          </Button>
        </ItemActions>
      </Item>
      <Item as="a" href="#item-demo" variant="outline" size="sm">
        <ItemMedia>
          <BadgeCheck class="size-5" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Your profile has been verified.</ItemTitle>
        </ItemContent>
        <ItemActions>
          <ChevronRight class="size-4" />
        </ItemActions>
      </Item>
    </div>
  );
}
