import { Button } from "@/registry/kobalte/ui/button";
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

export default function DrawerSides() {
  return (
    <Drawer swipeDirection="left">
      <DrawerTrigger as={Button} variant="secondary">
        Open Left Drawer
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Move Goal</DrawerTitle>
          <DrawerDescription>Set your daily activity goal.</DrawerDescription>
        </DrawerHeader>
        <div class="flex-1 p-4">
          <div class="size-full rounded-2xl bg-muted" />
        </div>
        <DrawerFooter>
          <DrawerClose as={Button}>Close</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
