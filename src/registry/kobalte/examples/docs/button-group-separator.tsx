import type { Component } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/registry/kobalte/ui/button-group";

const GroupSeparator = ButtonGroupSeparator as unknown as Component;

export default function ButtonGroupSeparatorDemo() {
  return (
    <ButtonGroup>
      <Button variant="secondary" size="sm">
        Copy
      </Button>
      <GroupSeparator />
      <Button variant="secondary" size="sm">
        Paste
      </Button>
    </ButtonGroup>
  );
}
