import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";

export default function AvatarBasic() {
  return (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" class="grayscale" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  );
}
