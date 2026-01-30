import { ArrowLeft, ArrowRight, CircleDashed, Save } from "lucide-solid";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";
import { Kbd, KbdGroup } from "@/registry/kobalte/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

export default function KbdExample() {
  return (
    <ExampleWrapper>
      <KbdBasic />
      <KbdModifierKeys />
      <KbdGroupExample />
      <KbdArrowKeys />
      <KbdWithIcons />
      <KbdWithIconsAndText />
      <KbdInInputGroup />
      <KbdInTooltip />
      <KbdWithSamp />
    </ExampleWrapper>
  );
}

function KbdBasic() {
  return (
    <Example title="Basic">
      <div class="flex items-center gap-2">
        <Kbd>Ctrl</Kbd>
        <Kbd>⌘K</Kbd>
        <Kbd>Ctrl + B</Kbd>
      </div>
    </Example>
  );
}

function KbdModifierKeys() {
  return (
    <Example title="Modifier Keys">
      <div class="flex items-center gap-2">
        <Kbd>⌘</Kbd>
        <Kbd>C</Kbd>
      </div>
    </Example>
  );
}

function KbdGroupExample() {
  return (
    <Example title="KbdGroup">
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>Shift</Kbd>
        <Kbd>P</Kbd>
      </KbdGroup>
    </Example>
  );
}

function KbdArrowKeys() {
  return (
    <Example title="Arrow Keys">
      <div class="flex items-center gap-2">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        <Kbd>←</Kbd>
        <Kbd>→</Kbd>
      </div>
    </Example>
  );
}

function KbdWithIcons() {
  return (
    <Example title="With Icons">
      <KbdGroup>
        <Kbd>
          <CircleDashed />
        </Kbd>
        <Kbd>
          <ArrowLeft />
        </Kbd>
        <Kbd>
          <ArrowRight />
        </Kbd>
      </KbdGroup>
    </Example>
  );
}

function KbdWithIconsAndText() {
  return (
    <Example title="With Icons and Text">
      <KbdGroup>
        <Kbd>
          <ArrowLeft />
          Left
        </Kbd>
        <Kbd>
          <CircleDashed />
          Voice Enabled
        </Kbd>
      </KbdGroup>
    </Example>
  );
}

function KbdInInputGroup() {
  return (
    <Example title="InputGroup">
      <InputGroup>
        <InputGroupInput />
        <InputGroupAddon align="inline-end">
          <Kbd>Space</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </Example>
  );
}

function KbdInTooltip() {
  return (
    <Example title="Tooltip">
      <Tooltip>
        <TooltipTrigger as={Button} size="icon-sm" variant="outline">
          <Save />
        </TooltipTrigger>
        <TooltipContent class="pr-1.5">
          <div class="flex items-center gap-2">
            Save Changes <Kbd>S</Kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    </Example>
  );
}

function KbdWithSamp() {
  return (
    <Example title="With samp">
      <Kbd>
        <samp>File</samp>
      </Kbd>
    </Example>
  );
}
