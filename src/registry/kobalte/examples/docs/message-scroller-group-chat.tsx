import { RotateCwIcon } from "lucide-solid";
import { createSignal, For } from "solid-js";
import { Bubble, BubbleContent } from "@/registry/kobalte/ui/bubble";
import { Button } from "@/registry/kobalte/ui/button";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/registry/kobalte/ui/message-scroller";
import { DemoCard } from "./message-scroller-utils";

type GroupItem = {
  id: string;
  sender?: string;
  text: string;
  type: "event" | "message";
  anchor?: boolean;
};
const baseItems: GroupItem[] = [
  { id: "grace", sender: "Grace", text: "Can you check my astrophage math?", type: "message" },
  {
    id: "mary",
    sender: "Mary (Agent)",
    text: "Confirmed. The curve points to a microorganism harvesting stellar energy.",
    type: "message",
  },
  { id: "ping", sender: "Grace", text: "ping @rocky", type: "message", anchor: true },
];
const rockyItems: GroupItem[] = [
  { id: "joined", text: "Rocky has joined the chat", type: "event", anchor: true },
  {
    id: "rocky",
    sender: "Rocky",
    text: "Amaze. Astrophage eats light, makes heat, goes to carbon dioxide.",
    type: "message",
  },
];

export default function MessageScrollerGroupChat() {
  const [count, setCount] = createSignal(0);
  const items = () => [...baseItems, ...rockyItems.slice(0, count())];
  return (
    <MessageScrollerProvider>
      <DemoCard
        title="Group Chat"
        description="A marker can be the turn anchor, not just a message."
        footer={
          <div class="flex w-full gap-2">
            <Button
              class="flex-1"
              variant="secondary"
              disabled={count() >= 2}
              onClick={() => setCount((value) => value + 1)}
            >
              {count() === 0 ? "Add Rocky" : "Send Message as Rocky"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Reset conversation"
              onClick={() => setCount(0)}
            >
              <RotateCwIcon />
            </Button>
          </div>
        }
      >
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent class="gap-4 p-(--card-spacing)">
              <For each={items()}>
                {(item) => (
                  <MessageScrollerItem
                    messageId={item.id}
                    scrollAnchor={item.anchor}
                    class={item.sender === "Grace" ? "flex justify-end" : undefined}
                  >
                    {item.type === "event" ? (
                      <p class="flex items-center gap-2 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                        {item.text}
                      </p>
                    ) : (
                      <div class="space-y-1">
                        {item.sender !== "Grace" && (
                          <p class="px-3 text-xs font-medium text-muted-foreground">
                            {item.sender}
                          </p>
                        )}
                        <Bubble variant={item.sender === "Grace" ? "muted" : "ghost"}>
                          <BubbleContent>{item.text}</BubbleContent>
                        </Bubble>
                      </div>
                    )}
                  </MessageScrollerItem>
                )}
              </For>
            </MessageScrollerContent>
            <MessageScrollerButton />
          </MessageScrollerViewport>
        </MessageScroller>
      </DemoCard>
    </MessageScrollerProvider>
  );
}
