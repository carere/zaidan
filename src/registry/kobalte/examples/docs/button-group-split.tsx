import { Plus } from "lucide-solid";
import type { Component } from "solid-js";

import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/registry/kobalte/ui/button-group";

const GroupSeparator = ButtonGroupSeparator as unknown as Component;

export default function ButtonGroupSplit() {
  return (
    <ButtonGroup>
      <Button variant="secondary">Button</Button>
      <GroupSeparator />
      <Button size="icon" variant="secondary" aria-label="Add">
        <Plus />
      </Button>
    </ButtonGroup>
  );
}
