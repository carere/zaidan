import { For, Index } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import { Input } from "@/registry/ui/input";
import { Label } from "@/registry/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/registry/ui/sheet";

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
          <div class="px-4">
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <Label for="sheet-demo-name">Name</Label>
                <Input id="sheet-demo-name" value="Pedro Duarte" />
              </div>
              <div class="flex flex-col gap-2">
                <Label for="sheet-demo-username">Username</Label>
                <Input id="sheet-demo-username" value="@peduarte" />
              </div>
            </div>
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
                <div class="no-scrollbar overflow-y-auto px-4">
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
