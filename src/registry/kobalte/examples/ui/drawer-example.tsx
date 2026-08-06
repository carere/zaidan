import { For, Index } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
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

const PARAGRAPHS = [
  "Your changes are saved automatically as you type.",
  "Delivery usually takes three to five business days, depending on your location and the shipping method you selected at checkout.",
  "We use your email address for account notifications and order updates. You can change this anytime from your profile settings.",
  "Two-factor authentication adds an extra layer of security to your account. When enabled, you'll need to enter a code from your authenticator app in addition to your password. We recommend enabling it if you store payment methods or sensitive information.",
  "By continuing, you agree to our Terms of Service and Privacy Policy. We collect usage data to improve the product, personalize your experience, and troubleshoot issues. You can export or delete your data at any time from the account settings page. Third-party integrations may have their own policies, and you should review them before connecting external services.",
  "Refunds are processed within five to ten business days after we receive your return. Items must be unused and in their original packaging to qualify. Shipping costs are non-refundable unless the return is due to our error or a defective product. Once approved, the refund is issued to your original payment method; credit card refunds may take an additional billing cycle to appear on your statement. If you paid with store credit, the balance is restored to your account immediately. Contact support if you haven't received your refund after two weeks.",
  "Last updated March 12, 2026.",
  "Upgrade to Pro for unlimited projects, priority support, and advanced analytics. Cancel anytime from billing settings.",
  "You haven't verified your email yet. Check your inbox for a confirmation link—we sent it when you signed up. The link expires after 24 hours, but you can request a new one below.",
  "API requests are rate-limited to 1,000 calls per hour on the free plan. Exceeding the limit returns a 429 response with a Retry-After header. Upgrade to a paid plan for higher limits and dedicated support. Webhook deliveries are retried up to three times with exponential backoff if your endpoint returns a non-2xx status.",
  "No payment method on file.",
  "Our design team rebuilt the checkout flow last quarter after interviews with forty-two customers. The biggest friction point was surprise fees at the final step, so we moved shipping and tax estimates earlier in the process. Early tests show a twelve percent drop in cart abandonment. We're still rolling out the update region by region, and you may see the old flow until your account is migrated.",
];

const DRAWER_SIDES = ["up", "right", "down", "left"] as const;
const SNAP_POINTS = ["31rem", 1] as const;

export default function DrawerExample() {
  return (
    <ExampleWrapper>
      <DrawerDemo />
      <DrawerSwipeHandleExample />
      <DrawerPosition />
      <DrawerCustomWidthAndHeight />
      <DrawerScrollable />
      <DrawerSnapPoints />
      <DrawerNested />
      <DrawerNonModal />
    </ExampleWrapper>
  );
}

function DrawerDemo() {
  return (
    <Example title="Demo">
      <div class="flex flex-wrap gap-2">
        <Drawer>
          <DrawerTrigger as={Button} variant="outline">
            Open Drawer
          </DrawerTrigger>
          <DrawerContent>
            <div class="p-4">
              <div class="h-80 w-full bg-muted" />
            </div>
          </DrawerContent>
        </Drawer>
        <Drawer>
          <DrawerTrigger as={Button} variant="outline">
            Header
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit profile</DrawerTitle>
              <DrawerDescription>
                Make changes to your profile here. Click save when you're done.
              </DrawerDescription>
            </DrawerHeader>
            <div class="p-4">
              <div class="h-80 w-full bg-muted" />
            </div>
          </DrawerContent>
        </Drawer>
        <Drawer>
          <DrawerTrigger as={Button} variant="outline">
            Footer
          </DrawerTrigger>
          <DrawerContent>
            <div class="p-4">
              <div class="h-80 w-full bg-muted" />
            </div>
            <DrawerFooter>
              <Button>Submit</Button>
              <DrawerClose as={Button} variant="outline">
                Cancel
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        <Drawer>
          <DrawerTrigger as={Button} variant="outline">
            Header and Footer
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit profile</DrawerTitle>
              <DrawerDescription>
                Make changes to your profile here. Click save when you're done.
              </DrawerDescription>
            </DrawerHeader>
            <div class="p-4">
              <div class="h-80 w-full bg-muted" />
            </div>
            <DrawerFooter>
              <Button>Submit</Button>
              <DrawerClose as={Button} variant="outline">
                Cancel
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        <Drawer>
          <DrawerTrigger as={Button} variant="outline">
            Edge to Edge
          </DrawerTrigger>
          <DrawerContent>
            <div class="h-80 w-full bg-blue-200" />
          </DrawerContent>
        </Drawer>
      </div>
    </Example>
  );
}

function DrawerSwipeHandleExample() {
  return (
    <Example title="Swipe Handle">
      <div class="flex flex-wrap gap-2">
        <For each={DRAWER_SIDES}>
          {(side) => (
            <Drawer swipeDirection={side} showSwipeHandle>
              <DrawerTrigger as={Button} variant="outline" class="capitalize">
                {side}
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle class="capitalize">Drawer</DrawerTitle>
                  <DrawerDescription>Drawer with a swipe handle.</DrawerDescription>
                </DrawerHeader>
                <DrawerFill />
              </DrawerContent>
            </Drawer>
          )}
        </For>
      </div>
    </Example>
  );
}

function DrawerCustomWidthAndHeight() {
  return (
    <Example title="Custom Width and Height">
      <div class="flex flex-wrap gap-2">
        <Drawer swipeDirection="down">
          <DrawerTrigger as={Button} variant="outline">
            Down
          </DrawerTrigger>
          <DrawerContent class="data-[swipe-direction=down]:h-64">
            <DrawerHeader>
              <DrawerTitle>Down drawer</DrawerTitle>
              <DrawerDescription>Drawer with a custom height.</DrawerDescription>
            </DrawerHeader>
            <DrawerParagraphs class="scrollbar-thin" />
            <DrawerCloseFooter />
          </DrawerContent>
        </Drawer>
        <Drawer swipeDirection="up">
          <DrawerTrigger as={Button} variant="outline">
            Up
          </DrawerTrigger>
          <DrawerContent class="data-[swipe-direction=up]:h-[50vh]">
            <DrawerHeader>
              <DrawerTitle>Up drawer</DrawerTitle>
              <DrawerDescription>Drawer with a custom height.</DrawerDescription>
            </DrawerHeader>
            <DrawerParagraphs />
            <DrawerCloseFooter />
          </DrawerContent>
        </Drawer>
        <Drawer swipeDirection="left">
          <DrawerTrigger as={Button} variant="outline">
            Left
          </DrawerTrigger>
          <DrawerContent class="data-[swipe-direction=left]:w-xl">
            <DrawerHeader>
              <DrawerTitle>Left drawer</DrawerTitle>
              <DrawerDescription>Drawer with a custom width.</DrawerDescription>
            </DrawerHeader>
            <DrawerParagraphs />
            <DrawerCloseFooter />
          </DrawerContent>
        </Drawer>
        <Drawer swipeDirection="right">
          <DrawerTrigger as={Button} variant="outline">
            Right
          </DrawerTrigger>
          <DrawerContent class="data-[swipe-direction=right]:w-xs">
            <DrawerHeader>
              <DrawerTitle>Right drawer</DrawerTitle>
              <DrawerDescription>Drawer with a custom width.</DrawerDescription>
            </DrawerHeader>
            <DrawerParagraphs />
            <DrawerCloseFooter />
          </DrawerContent>
        </Drawer>
      </div>
    </Example>
  );
}

function DrawerPosition() {
  return (
    <Example title="Position">
      <div class="flex flex-wrap gap-2">
        <For each={DRAWER_SIDES}>
          {(side) => (
            <Drawer swipeDirection={side}>
              <DrawerTrigger as={Button} variant="outline" class="capitalize">
                {side}
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Move Goal</DrawerTitle>
                  <DrawerDescription>Set your daily activity goal.</DrawerDescription>
                </DrawerHeader>
                <DrawerFill />
                <DrawerSubmitFooter />
              </DrawerContent>
            </Drawer>
          )}
        </For>
      </div>
    </Example>
  );
}

function DrawerScrollable() {
  return (
    <Example title="Scrollable Content">
      <div class="flex flex-wrap gap-2">
        <For each={DRAWER_SIDES}>
          {(side) => (
            <Drawer swipeDirection={side}>
              <DrawerTrigger as={Button} variant="outline" class="capitalize">
                {side}
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Move Goal</DrawerTitle>
                  <DrawerDescription>Set your daily activity goal.</DrawerDescription>
                </DrawerHeader>
                <DrawerParagraphs count={20} />
                <DrawerSubmitFooter />
              </DrawerContent>
            </Drawer>
          )}
        </For>
      </div>
    </Example>
  );
}

function DrawerSnapPoints() {
  return (
    <Example title="Snap Points">
      <Drawer snapPoints={[...SNAP_POINTS]} showSwipeHandle>
        <DrawerTrigger as={Button} variant="outline">
          Open Snap Drawer
        </DrawerTrigger>
        <DrawerContent class="max-h-[calc(100dvh-1rem)]">
          <DrawerHeader>
            <DrawerTitle>Snap points</DrawerTitle>
            <DrawerDescription>
              Drag the drawer to snap between a compact peek and a near full-height view.
            </DrawerDescription>
          </DrawerHeader>
          <div class="grid flex-1 scroll-fade gap-3 overflow-y-auto p-4">
            <Index each={Array.from({ length: 16 })}>{() => <div class="h-12 bg-muted" />}</Index>
          </div>
        </DrawerContent>
      </Drawer>
    </Example>
  );
}

function DrawerNested() {
  return (
    <Example title="Nested">
      <div class="flex flex-wrap gap-2">
        <For each={DRAWER_SIDES}>
          {(side) => (
            <Drawer swipeDirection={side} showSwipeHandle>
              <DrawerTrigger as={Button} variant="outline" class="capitalize">
                {side}
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle class="capitalize">{side} drawer</DrawerTitle>
                  <DrawerDescription>
                    Open another drawer from the same direction.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFill />
                <DrawerFooter>
                  <Drawer swipeDirection={side}>
                    <DrawerTrigger as={Button}>Open nested drawer</DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>Nested drawer</DrawerTitle>
                        <DrawerDescription>
                          The parent drawer stays mounted behind this one.
                        </DrawerDescription>
                      </DrawerHeader>
                      <DrawerFill />
                      <DrawerFooter>
                        <Drawer swipeDirection={side}>
                          <DrawerTrigger as={Button}>Open third drawer</DrawerTrigger>
                          <DrawerContent>
                            <DrawerHeader>
                              <DrawerTitle>Third drawer</DrawerTitle>
                              <DrawerDescription>
                                This is the frontmost drawer in the stack.
                              </DrawerDescription>
                            </DrawerHeader>
                            <DrawerFill />
                            <DrawerCloseFooter />
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
          )}
        </For>
      </div>
    </Example>
  );
}

function DrawerNonModal() {
  return (
    <Example title="Non Modal">
      <Drawer modal={false} disablePointerDismissal swipeDirection="right">
        <DrawerTrigger as={Button} variant="outline">
          Non Modal
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Non Modal Drawer</DrawerTitle>
          </DrawerHeader>
          <DrawerFill />
          <DrawerCloseFooter />
        </DrawerContent>
      </Drawer>
    </Example>
  );
}

function DrawerFill() {
  return (
    <div class="flex-1 p-4">
      <div class="bg-muted group-data-[swipe-axis=x]/drawer-popup:size-full group-data-[swipe-axis=y]/drawer-popup:h-80 group-data-[swipe-axis=y]/drawer-popup:w-full" />
    </div>
  );
}

function DrawerParagraphs(props: { class?: string; count?: number }) {
  return (
    <div class={`flex-1 scroll-fade overflow-y-auto p-4 ${props.class ?? ""}`}>
      <Index each={Array.from({ length: props.count ?? 10 })}>
        {(_, index) => (
          <p class="mb-4 leading-normal style-lyra:mb-2 style-lyra:leading-relaxed">
            {PARAGRAPHS[index % PARAGRAPHS.length]}
          </p>
        )}
      </Index>
    </div>
  );
}

function DrawerSubmitFooter() {
  return (
    <DrawerFooter>
      <Button>Submit</Button>
      <DrawerClose as={Button} variant="outline">
        Cancel
      </DrawerClose>
    </DrawerFooter>
  );
}

function DrawerCloseFooter() {
  return (
    <DrawerFooter>
      <DrawerClose as={Button} variant="outline">
        Close
      </DrawerClose>
    </DrawerFooter>
  );
}
