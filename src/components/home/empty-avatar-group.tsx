import { PlusIcon } from "lucide-solid";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/kobalte/ui/empty";

export default function EmptyAvatarGroup() {
  return (
    <Empty class="flex-none border py-10">
      <EmptyHeader>
        <EmptyMedia>
          <AvatarGroup class="grayscale">
            <Avatar>
              <AvatarImage src="https://github.com/carere.png" alt="@carere" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </AvatarGroup>
        </EmptyMedia>
        <EmptyTitle>No Team Members</EmptyTitle>
        <EmptyDescription>Invite your team to collaborate on this project.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm">
          <PlusIcon />
          Invite Members
        </Button>
      </EmptyContent>
    </Empty>
  );
}
