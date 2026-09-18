import type { ComponentProps } from "solid-js";
import { createSignal, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/registry/kobalte/hooks/use-mobile";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/kobalte/ui/drawer";
import { Input } from "@/registry/kobalte/ui/input";
import { Label } from "@/registry/kobalte/ui/label";

export default function DrawerDialog() {
  const [open, setOpen] = createSignal(false);
  const isMobile = useIsMobile();

  return (
    <Show
      when={!isMobile()}
      fallback={
        <Drawer open={open()} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
          <DrawerTrigger as={Button} variant="outline">
            Edit Profile
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader class="text-left">
              <DrawerTitle>Edit profile</DrawerTitle>
              <DrawerDescription>
                Make changes to your profile here. Click save when you're done.
              </DrawerDescription>
            </DrawerHeader>
            <ProfileForm class="p-4" />
            <DrawerFooter>
              <DrawerClose as={Button} variant="outline">
                Cancel
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      }
    >
      <Dialog open={open()} onOpenChange={setOpen}>
        <DialogTrigger as={Button} variant="outline">
          Edit Profile
        </DialogTrigger>
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <ProfileForm />
        </DialogContent>
      </Dialog>
    </Show>
  );
}

function ProfileForm(props: ComponentProps<"form">) {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <form class={cn("grid items-start gap-6", local.class)} {...others}>
      <div class="grid gap-3">
        <Label for="email">Email</Label>
        <Input type="email" id="email" value="shadcn@example.com" />
      </div>
      <div class="grid gap-3">
        <Label for="username">Username</Label>
        <Input id="username" value="@shadcn" />
      </div>
      <Button type="submit">Save changes</Button>
    </form>
  );
}
