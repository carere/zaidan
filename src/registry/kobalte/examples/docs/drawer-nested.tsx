import type { JSX } from "solid-js";
import { useIsMobile } from "@/registry/kobalte/hooks/use-mobile";
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

function DrawerPanel(props: { children?: JSX.Element }) {
  return (
    <div class="flex-1 p-4">
      <div class="bg-muted group-data-[swipe-axis=x]/drawer-popup:size-full group-data-[swipe-axis=y]/drawer-popup:aspect-video group-data-[swipe-axis=y]/drawer-popup:w-full">
        {props.children}
      </div>
    </div>
  );
}

export default function DrawerNested() {
  const isMobile = useIsMobile();
  const swipeDirection = () => (isMobile() ? "down" : "right");

  return (
    <Drawer showSwipeHandle={isMobile()} swipeDirection={swipeDirection()}>
      <DrawerTrigger as={Button} variant="secondary">
        Open Drawer
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Drawer</DrawerTitle>
          <DrawerDescription>Open another drawer from the same direction.</DrawerDescription>
        </DrawerHeader>
        <DrawerPanel />
        <DrawerFooter>
          <Drawer showSwipeHandle={isMobile()} swipeDirection={swipeDirection()}>
            <DrawerTrigger as={Button} variant="outline">
              Open Nested Drawer
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Nested Drawer</DrawerTitle>
                <DrawerDescription>
                  The parent drawer stays mounted behind this one.
                </DrawerDescription>
              </DrawerHeader>
              <DrawerPanel />
              <DrawerFooter>
                <Drawer showSwipeHandle={isMobile()} swipeDirection={swipeDirection()}>
                  <DrawerTrigger as={Button} variant="outline">
                    Open Third Drawer
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Third Drawer</DrawerTitle>
                      <DrawerDescription>
                        Two drawers are stacked behind this one.
                      </DrawerDescription>
                    </DrawerHeader>
                    <DrawerPanel />
                    <DrawerFooter>
                      <Drawer showSwipeHandle={isMobile()} swipeDirection={swipeDirection()}>
                        <DrawerTrigger as={Button} variant="outline">
                          Open Fourth Drawer
                        </DrawerTrigger>
                        <DrawerContent>
                          <DrawerHeader>
                            <DrawerTitle>Fourth Drawer</DrawerTitle>
                            <DrawerDescription>
                              This is the frontmost drawer in the stack.
                            </DrawerDescription>
                          </DrawerHeader>
                          <DrawerPanel />
                          <DrawerFooter>
                            <DrawerClose as={Button} variant="outline">
                              Close
                            </DrawerClose>
                          </DrawerFooter>
                        </DrawerContent>
                      </Drawer>
                      <DrawerClose as={Button} variant="outline">
                        Close
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
                <DrawerClose as={Button} variant="outline">
                  Close
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          <DrawerClose as={Button} variant="outline">
            Close
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
