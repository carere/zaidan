import { For, Index } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/registry/kobalte/ui/sheet";

export default function SheetExample() {
  return (
    <ExampleWrapper>
      <SheetWithForm />
      <SheetNoCloseButton />
      <SheetWithSides />
    </ExampleWrapper>
  );
}

function SheetWithForm() {
  return (
    <Example title="With Form">
      <Sheet>
        <SheetTrigger as={Button} variant="outline">
          Open
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>
              Make changes to your profile here. Click save when you&apos;re done.
            </SheetDescription>
          </SheetHeader>
          <div class="style-vega:px-4 style-nova:px-4 style-lyra:px-4 style-maia:px-6 style-mira:px-6 style-luma:px-6 style-rhea:px-6">
            <FieldGroup>
              <Field>
                <FieldLabel for="sheet-demo-name">Name</FieldLabel>
                <Input id="sheet-demo-name" value="Pedro Duarte" />
              </Field>
              <Field>
                <FieldLabel for="sheet-demo-username">Username</FieldLabel>
                <Input id="sheet-demo-username" value="@peduarte" />
              </Field>
            </FieldGroup>
          </div>
          <SheetFooter>
            <Button type="submit">Save changes</Button>
            <SheetClose as={Button} variant="outline">
              Close
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Example>
  );
}

function SheetNoCloseButton() {
  return (
    <Example title="No Close Button">
      <Sheet>
        <SheetTrigger as={Button} variant="outline">
          No Close Button
        </SheetTrigger>
        <SheetContent showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>No Close Button</SheetTitle>
            <SheetDescription>
              This sheet doesn&apos;t have a close button in the top-right corner. You can only
              close it using the button below.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </Example>
  );
}

const SHEET_SIDES = ["top", "right", "bottom", "left"] as const;

function SheetWithSides() {
  return (
    <Example title="Sides">
      <div class="flex flex-wrap gap-2">
        <For each={SHEET_SIDES}>
          {(side) => (
            <Sheet>
              <SheetTrigger as={Button} variant="outline" class="capitalize">
                {side}
              </SheetTrigger>
              <SheetContent
                side={side}
                class="data-[side=bottom]:max-h-[50vh] data-[side=top]:max-h-[50vh]"
              >
                <SheetHeader>
                  <SheetTitle>Edit profile</SheetTitle>
                  <SheetDescription>
                    Make changes to your profile here. Click save when you&apos;re done.
                  </SheetDescription>
                </SheetHeader>
                <div class="no-scrollbar overflow-y-auto style-vega:px-4 style-nova:px-4 style-lyra:px-4 style-maia:px-6 style-mira:px-6 style-luma:px-6 style-rhea:px-6">
                  <Index each={Array.from({ length: 10 })}>
                    {() => (
                      <p class="mb-4 style-lyra:mb-2 leading-normal style-lyra:leading-relaxed">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
                        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
                        quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                        consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
                        cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
                        non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                      </p>
                    )}
                  </Index>
                </div>
                <SheetFooter>
                  <Button type="submit">Save changes</Button>
                  <SheetClose as={Button} variant="outline">
                    Cancel
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}
        </For>
      </div>
    </Example>
  );
}
