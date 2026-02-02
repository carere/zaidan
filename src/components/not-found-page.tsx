import { CircleDashed } from "lucide-solid";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/registry/kobalte/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";
import { Kbd } from "@/registry/kobalte/ui/kbd";

interface NotFoundPageProps {
  title?: string;
  description?: string;
}

export function NotFoundPage(props: NotFoundPageProps) {
  const title = () => props.title ?? "404 - Not Found";
  const description = () =>
    props.description ??
    "The page you're looking for doesn't exist. Try searching for what you need below.";

  return (
    <Empty class="border">
      <EmptyHeader>
        <EmptyTitle>{title()}</EmptyTitle>
        <EmptyDescription>{description()}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <InputGroup class="w-3/4">
          <InputGroupInput placeholder="Try searching for pages..." />
          <InputGroupAddon>
            <CircleDashed />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        </InputGroup>
        <EmptyDescription>
          Need help? <a href="/">Go to homepage</a>
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
