import { MaximizeIcon, MinimizeIcon } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/kobalte/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";

export default function CollapsibleSettings() {
  const [open, setOpen] = createSignal(false);

  return (
    <Card class="mx-auto w-full max-w-xs" size="sm">
      <CardHeader>
        <CardTitle>Radius</CardTitle>
        <CardDescription>Set the corner radius of the element.</CardDescription>
      </CardHeader>
      <CardContent>
        <Collapsible open={open()} onOpenChange={setOpen} class="flex items-start gap-2">
          <FieldGroup class="grid w-full grid-cols-2 gap-2">
            <Field>
              <FieldLabel for="collapsible-radius-x" class="sr-only">
                Radius X
              </FieldLabel>
              <Input id="collapsible-radius-x" placeholder="0" value="0" />
            </Field>
            <Field>
              <FieldLabel for="collapsible-radius-y" class="sr-only">
                Radius Y
              </FieldLabel>
              <Input id="collapsible-radius-y" placeholder="0" value="0" />
            </Field>
            <CollapsibleContent class="col-span-full grid grid-cols-subgrid gap-2">
              <Field>
                <FieldLabel for="collapsible-radius-z" class="sr-only">
                  Radius Z
                </FieldLabel>
                <Input id="collapsible-radius-z" placeholder="0" value="0" />
              </Field>
              <Field>
                <FieldLabel for="collapsible-radius-w" class="sr-only">
                  Radius W
                </FieldLabel>
                <Input id="collapsible-radius-w" placeholder="0" value="0" />
              </Field>
            </CollapsibleContent>
          </FieldGroup>
          <CollapsibleTrigger
            as={Button}
            variant="outline"
            size="icon"
            aria-label="Toggle radius settings"
          >
            <Show when={open()} fallback={<MaximizeIcon />}>
              <MinimizeIcon />
            </Show>
          </CollapsibleTrigger>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
