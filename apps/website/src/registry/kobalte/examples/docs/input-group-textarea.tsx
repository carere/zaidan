import { BracesIcon, CopyIcon, CornerDownLeftIcon, RefreshCwIcon } from "lucide-solid";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/registry/kobalte/ui/input-group";

export default function InputGroupTextareaExample() {
  return (
    <div class="grid w-full max-w-md gap-4">
      <InputGroup>
        <InputGroupTextarea
          id="textarea-code-32"
          placeholder="console.log('Hello, world!');"
          class="min-h-[200px]"
        />
        <InputGroupAddon align="block-end" class="border-t">
          <InputGroupText>Line 1, Column 1</InputGroupText>
          <InputGroupButton size="sm" class="ml-auto" variant="default">
            Run <CornerDownLeftIcon />
          </InputGroupButton>
        </InputGroupAddon>
        <InputGroupAddon align="block-start" class="border-b">
          <InputGroupText class="font-mono font-medium">
            <BracesIcon />
            script.js
          </InputGroupText>
          <InputGroupButton class="ml-auto" size="icon-xs" aria-label="Refresh">
            <RefreshCwIcon />
          </InputGroupButton>
          <InputGroupButton variant="ghost" size="icon-xs" aria-label="Copy">
            <CopyIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
