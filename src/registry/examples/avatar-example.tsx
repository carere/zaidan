import { Example, ExampleWrapper } from "@/components/example";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/ui/avatar";

export default function AvatarExample() {
  return (
    <ExampleWrapper>
      <AvatarBasic />
      <AvatarWithFallback />
    </ExampleWrapper>
  );
}

function AvatarBasic() {
  return (
    <Example title="Basic">
      <div class="flex flex-wrap items-center gap-4">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarImage src="https://github.com/jorgezreik.png" alt="@jorgezreik" />
          <AvatarFallback>JZ</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarImage src="https://github.com/maxleiter.png" alt="@maxleiter" />
          <AvatarFallback>ML</AvatarFallback>
        </Avatar>
      </div>
    </Example>
  );
}

function AvatarWithFallback() {
  return (
    <Example title="With Fallback">
      <div class="flex flex-wrap items-center gap-4">
        <Avatar>
          <AvatarImage src="/broken-image.jpg" alt="Broken" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>JZ</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>ML</AvatarFallback>
        </Avatar>
      </div>
    </Example>
  );
}
