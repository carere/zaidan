import { createMemo, createSignal } from "solid-js";
import { parseTypesetCodeInput } from "@/lib/typeset-code";
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

/** Loads a saved typeset: a bare code, `@zaidan/typeset-<code>`, or a link. */
export function TypesetOpenCode(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCode: (code: string) => void;
}) {
  const [input, setInput] = createSignal("");
  const code = createMemo(() => parseTypesetCodeInput(input()));
  const isInvalid = createMemo(() => input().trim().length > 0 && !code());

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
        <span class="w-full truncate text-center font-normal md:hidden">Open</span>
        <span class="hidden w-full truncate text-center font-normal md:block">Open Typeset</span>
      </DialogTrigger>
      <DialogContent class="dark sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const nextCode = code();
            if (!nextCode) return;
            props.onOpenCode(nextCode);
            handleOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Open Typeset</DialogTitle>
            <DialogDescription>Paste a typeset code to load a saved design.</DialogDescription>
          </DialogHeader>
          <div class="py-4">
            <Field data-invalid={isInvalid() || undefined}>
              <FieldLabel for="typeset-code" class="sr-only">
                Typeset code
              </FieldLabel>
              <FieldContent>
                <Input
                  id="typeset-code"
                  value={input()}
                  onInput={(event) => setInput(event.currentTarget.value)}
                  placeholder="a1JbnM or @zaidan/typeset-a1JbnM"
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
            <Button type="submit" disabled={!code()}>
              Open
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
