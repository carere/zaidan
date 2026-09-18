import { Plus } from "lucide-solid";
import { For } from "solid-js";

import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/kobalte/ui/item";

const people = [
  { username: "carere", avatar: "https://github.com/carere.png", email: "carere@example.com" },
  { username: "shadcn", avatar: "https://github.com/shadcn.png", email: "shadcn@vercel.com" },
  {
    username: "evilrabbit",
    avatar: "https://github.com/evilrabbit.png",
    email: "evilrabbit@vercel.com",
  },
];

export default function ItemGroupDemo() {
  return (
    <ItemGroup class="max-w-sm">
      <For each={people}>
        {(person) => (
          <Item variant="outline" role="listitem">
            <ItemMedia>
              <Avatar>
                <AvatarImage src={person.avatar} alt={`@${person.username}`} class="grayscale" />
                <AvatarFallback>{person.username.charAt(0)}</AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent class="gap-1">
              <ItemTitle>{person.username}</ItemTitle>
              <ItemDescription>{person.email}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                variant="ghost"
                size="icon"
                class="rounded-full"
                aria-label={`Add ${person.username}`}
              >
                <Plus />
              </Button>
            </ItemActions>
          </Item>
        )}
      </For>
    </ItemGroup>
  );
}
