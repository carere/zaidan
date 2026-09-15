import { Search } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent } from "@/registry/kobalte/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/registry/kobalte/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";
import { Kbd } from "@/registry/kobalte/ui/kbd";

export function NotFound() {
  return (
    <Card>
      <CardContent>
        <Empty class="h-72">
          <EmptyHeader>
            <EmptyTitle>404 - Not Found</EmptyTitle>
            <EmptyDescription>
              The page you&apos;re looking for doesn&apos;t exist. Try searching for what you need
              below.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <InputGroup class="w-3/4">
              <InputGroupInput placeholder="Try searching for pages..." />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                <Kbd>/</Kbd>
              </InputGroupAddon>
            </InputGroup>
            <Button variant="link">Go to homepage</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  );
}
