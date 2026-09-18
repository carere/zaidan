import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/registry/kobalte/ui/avatar";

export default function AvatarGroupDemo() {
  return (
    <AvatarGroup class="grayscale">
      <Avatar>
        <AvatarImage src="https://github.com/carere.png" alt="@carere" />
        <AvatarFallback>CR</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src="https://github.com/evilrabbit.png" alt="@evilrabbit" />
        <AvatarFallback>ER</AvatarFallback>
      </Avatar>
    </AvatarGroup>
  );
}
