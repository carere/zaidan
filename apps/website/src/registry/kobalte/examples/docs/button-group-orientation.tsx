import { Minus, Plus } from "lucide-solid";

import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroup } from "@/registry/kobalte/ui/button-group";

export default function ButtonGroupOrientation() {
  return (
    <ButtonGroup orientation="vertical" aria-label="Media controls" class="h-fit">
      <Button variant="outline" size="icon" aria-label="Increase">
        <Plus />
      </Button>
      <Button variant="outline" size="icon" aria-label="Decrease">
        <Minus />
      </Button>
    </ButtonGroup>
  );
}
