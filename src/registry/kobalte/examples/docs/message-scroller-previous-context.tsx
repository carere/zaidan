import { ArrowUpIcon, RotateCwIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { MessageScroller, MessageScrollerProvider } from "@/registry/kobalte/ui/message-scroller";
import { Slider } from "@/registry/kobalte/ui/slider";
import { DemoCard, type DemoMessage, Transcript, transcript } from "./message-scroller-utils";

const nextTurn: DemoMessage[] = [
  { id: "peek-question", role: "user", text: "Keep some of the previous reply visible." },
  {
    id: "peek-answer",
    role: "assistant",
    text: "The previous-item peek preserves context while this answer grows below the new turn.",
  },
];

export default function MessageScrollerPreviousContext() {
  const [peek, setPeek] = createSignal(64);
  const [messages, setMessages] = createSignal(transcript.slice(0, 4));
  return (
    <MessageScrollerProvider scrollPreviousItemPeek={peek()}>
      <DemoCard
        title="Keeping Context Visible"
        description="Adjust the previous-turn peek, then append a new turn."
        footer={
          <div class="flex w-full items-center gap-3">
            <span class="text-xs tabular-nums text-muted-foreground">{peek()}px</span>
            <Slider
              class="w-28"
              aria-label="Previous context peek"
              value={[peek()]}
              minValue={32}
              maxValue={128}
              onChange={(value) => setPeek(value[0] ?? 64)}
            />
            <Button
              class="ml-auto"
              variant="outline"
              size="icon"
              aria-label="Reset context example"
              onClick={() => {
                setPeek(64);
                setMessages(transcript.slice(0, 4));
              }}
            >
              <RotateCwIcon />
            </Button>
            <Button
              size="icon"
              disabled={messages().length > 4}
              onClick={() => setMessages((current) => [...current, ...nextTurn])}
            >
              <ArrowUpIcon />
              <span class="sr-only">Send</span>
            </Button>
          </div>
        }
      >
        <MessageScroller>
          <Transcript messages={messages()} anchor={(message) => message.role === "user"} />
        </MessageScroller>
      </DemoCard>
    </MessageScrollerProvider>
  );
}
