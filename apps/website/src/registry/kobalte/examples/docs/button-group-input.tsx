import { Search } from "lucide-solid";

import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroup } from "@/registry/kobalte/ui/button-group";
import { Input } from "@/registry/kobalte/ui/input";

export default function ButtonGroupInput() {
  return (
    <ButtonGroup>
      <Input placeholder="Search..." />
      <Button variant="outline" aria-label="Search">
        <Search />
      </Button>
    </ButtonGroup>
  );
}
