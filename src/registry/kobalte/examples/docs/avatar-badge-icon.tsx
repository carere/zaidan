import { PlusIcon } from "lucide-solid";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";

export default function AvatarBadgeIcon() {
  return (
    <Avatar class="grayscale">
      <AvatarImage src="https://github.com/pranathip.png" alt="@pranathip" />
      <AvatarFallback>PP</AvatarFallback>
      <AvatarBadge>
        <PlusIcon />
      </AvatarBadge>
    </Avatar>
  );
}
