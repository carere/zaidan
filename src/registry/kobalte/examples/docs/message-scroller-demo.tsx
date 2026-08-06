import { ArrowUpIcon, RotateCwIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { MessageScroller, MessageScrollerProvider } from "@/registry/kobalte/ui/message-scroller";
import { DemoCard, type DemoMessage, Transcript, transcript } from "./message-scroller-utils";

const nextTurn: DemoMessage[] = [
  { id: "new-question", role: "user", text: "How do I return to the newest streamed reply?" },
  {
    id: "new-answer",
    role: "assistant",
    text: "Use MessageScrollerButton. It stays out of the tab order until there is content below the reader, then returns them to the live edge.",
  },
];

export default function MessageScrollerDemo() {
  const [messages, setMessages] = createSignal(transcript);
  const send = () => setMessages((current) => [...current, ...nextTurn]);

  return (
    <MessageScrollerProvider autoScroll>
      <DemoCard
        title="New Chat"
        description="A transcript that follows only while you are at the live edge."
        footer={
          <div class="flex w-full justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Reset conversation"
              onClick={() => setMessages(transcript)}
            >
              <RotateCwIcon />
            </Button>
            <Button onClick={send} disabled={messages().length > transcript.length}>
              <ArrowUpIcon />
              <span class="sr-only">Send Message</span>
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
