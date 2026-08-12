import { ChevronDown } from "lucide-solid";
import { For } from "solid-js";

import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { buttonVariants } from "@/registry/kobalte/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import {
  Item,
  ItemContent,
  ItemDescription,
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

export default function ItemDropdown() {
  return (
    <DropdownMenu placement="bottom-end">
      <DropdownMenuTrigger class={buttonVariants({ variant: "outline" })}>
        Select <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-48">
        <DropdownMenuGroup>
          <For each={people}>
            {(person) => (
              <DropdownMenuItem textValue={person.username}>
                <Item size="xs" class="w-full p-2">
                  <ItemMedia>
                    <Avatar class="size-[--spacing(6.5)]">
                      <AvatarImage
                        src={person.avatar}
                        alt={`@${person.username}`}
                        class="grayscale"
                      />
                      <AvatarFallback>{person.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent class="gap-0">
                    <ItemTitle>{person.username}</ItemTitle>
                    <ItemDescription class="leading-none">{person.email}</ItemDescription>
                  </ItemContent>
                </Item>
              </DropdownMenuItem>
            )}
          </For>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
