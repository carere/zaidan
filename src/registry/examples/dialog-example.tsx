import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/ui/dialog";
import { Input } from "@/registry/ui/input";
import { Label } from "@/registry/ui/label";

export default function DialogExample() {
  return (
    <ExampleWrapper>
      <DialogWithForm />
      <DialogScrollableContent />
      <DialogWithStickyFooter />
      <DialogNoCloseButton />
    </ExampleWrapper>
  );
}

function DialogWithForm() {
  return (
    <Example title="With Form" class="items-center justify-center">
      <Dialog>
        <form>
          <DialogTrigger as={Button} variant="outline">
            Edit Profile
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Make changes to your profile here. Click save when you're done. Your profile will be
                updated immediately.
              </DialogDescription>
            </DialogHeader>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <Label for="name-1">Name</Label>
                <Input id="name-1" name="name" value="Pedro Duarte" />
              </div>
              <div class="flex flex-col gap-2">
                <Label for="username-1">Username</Label>
                <Input id="username-1" name="username" value="@peduarte" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose as={Button} variant="outline">
                Cancel
              </DialogClose>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>
    </Example>
  );
}

function DialogScrollableContent() {
  return (
    <Example title="Scrollable Content" class="items-center justify-center">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          Scrollable Content
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scrollable Content</DialogTitle>
            <DialogDescription>This is a dialog with scrollable content.</DialogDescription>
          </DialogHeader>
          <div class="max-h-[70vh] overflow-y-auto">
            <For each={Array.from({ length: 10 })}>
              {() => (
                <p class="mb-4 leading-normal">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute
                  irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
                  pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
                  officia deserunt mollit anim id est laborum.
                </p>
              )}
            </For>
          </div>
        </DialogContent>
      </Dialog>
    </Example>
  );
}

function DialogWithStickyFooter() {
  return (
    <Example title="With Sticky Footer" class="items-center justify-center">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          Sticky Footer
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scrollable Content</DialogTitle>
            <DialogDescription>This is a dialog with scrollable content.</DialogDescription>
          </DialogHeader>
          <div class="max-h-[70vh] overflow-y-auto">
            <For each={Array.from({ length: 10 })}>
              {() => (
                <p class="mb-4 leading-normal">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute
                  irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
                  pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
                  officia deserunt mollit anim id est laborum.
                </p>
              )}
            </For>
          </div>
          <DialogFooter>
            <DialogClose as={Button} variant="outline">
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Example>
  );
}

function DialogNoCloseButton() {
  return (
    <Example title="No Close Button" class="items-center justify-center">
      <Dialog>
        <DialogTrigger as={Button} variant="outline">
          No Close Button
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>No Close Button</DialogTitle>
            <DialogDescription>
              This dialog doesn't have a close button in the top-right corner.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose as={Button} variant="outline">
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Example>
  );
}
