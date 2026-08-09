import { For } from "solid-js";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/registry/kobalte/ui/hover-card";
import {
  MessageScroller,
  MessageScrollerProvider,
  useMessageScroller,
  useMessageScrollerVisibility,
} from "@/registry/kobalte/ui/message-scroller";
import { DemoCard, Transcript, transcript } from "./message-scroller-utils";

export default function MessageScrollerVisibility() {
  return (
    <MessageScrollerProvider scrollMargin={12}>
      <DemoCard
        title="Transcript Outline"
        description="Track and jump to the current anchored turn."
      >
        <div class="relative h-full">
          <MessageScroller>
            <Transcript anchor={(message) => message.role === "user"} />
          </MessageScroller>
          <TranscriptOutline />
        </div>
      </DemoCard>
    </MessageScrollerProvider>
  );
}

function TranscriptOutline() {
  const { scrollToMessage } = useMessageScroller();
  const { currentAnchorId } = useMessageScrollerVisibility();
  const questions = transcript.filter((message) => message.role === "user");
  return (
    <div class="absolute top-3 right-3">
      <HoverCard placement="bottom-end">
        <HoverCardTrigger
          as="button"
          type="button"
          aria-label="Open transcript outline"
          class="flex h-9 w-9 flex-col items-center justify-center gap-1 rounded-md border bg-background outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {questions.map((message) => (
            <span
              data-current={message.id === currentAnchorId}
              class="h-0.5 w-4 rounded-full bg-muted-foreground/40 data-[current=true]:bg-foreground"
            />
          ))}
        </HoverCardTrigger>
        <HoverCardContent class="flex w-64 flex-col gap-1 rounded-xl p-1">
          <For each={questions}>
            {(message) => (
              <button
                type="button"
                aria-current={currentAnchorId === message.id ? "location" : undefined}
                class="rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent"
                onClick={() => scrollToMessage(message.id, { align: "start", behavior: "smooth" })}
              >
                {message.text}
              </button>
            )}
          </For>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
