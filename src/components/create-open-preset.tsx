import { createMemo, createSignal } from "solid-js";
import { decodeDesignSystemPreset } from "@/lib/preset";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";

function parsePresetInput(input: string) {
  const value = input.trim();
  if (!value) return null;

  const cliMatch = value.match(/--preset(?:=|\s+)([\w-]+)/);
  const registryMatch = value.match(/@zaidan\/preset-([\w-]+)/);
  const urlPreset = (() => {
    try {
      return new URL(value, "https://zaidan.dev").searchParams.get("preset");
    } catch {
      return null;
    }
  })();
  const code = cliMatch?.[1] ?? registryMatch?.[1] ?? urlPreset ?? value.replace(/^preset-/, "");

  return decodeDesignSystemPreset(code) ? code : null;
}

export function CreateOpenPreset(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPreset: (preset: string) => void;
}) {
  const [input, setInput] = createSignal("");
  const preset = createMemo(() => parsePresetInput(input()));
  const isInvalid = createMemo(() => input().trim().length > 0 && !preset());

  const handleOpenChange = (open: boolean) => {
    props.onOpenChange(open);
    if (!open) setInput("");
  };

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        as={Button}
        variant="outline"
        class="max-w-20 min-w-0 flex-1 touch-manipulation bg-transparent px-2 text-sm transition-none sm:max-w-none md:flex-none"
      >
        <span class="w-full truncate text-center font-normal sm:hidden">Open</span>
        <span class="hidden w-full truncate text-center font-normal sm:block">Open Preset</span>
      </DialogTrigger>
      <DialogContent class="dark sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const nextPreset = preset();
            if (!nextPreset) return;
            props.onOpenPreset(nextPreset);
            handleOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Open Preset</DialogTitle>
            <DialogDescription>
              Paste a preset code to load a saved configuration.
            </DialogDescription>
          </DialogHeader>
          <div class="py-4">
            <Field data-invalid={isInvalid() || undefined}>
              <FieldLabel for="preset-code" class="sr-only">
                Preset code
              </FieldLabel>
              <FieldContent>
                <Input
                  id="preset-code"
                  value={input()}
                  onInput={(event) => setInput(event.currentTarget.value)}
                  placeholder="b2D0wqNxT or --preset b2D0wqNxT"
                  autocapitalize="none"
                  autocorrect="off"
                  spellcheck={false}
                  aria-invalid={isInvalid()}
                  class="h-10 md:h-8"
                />
              </FieldContent>
            </Field>
          </div>
          <DialogFooter>
            <DialogClose as={Button} variant="outline" type="button">
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!preset()}>
              Open
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
