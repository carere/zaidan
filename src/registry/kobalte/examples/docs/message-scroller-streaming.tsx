import { ArrowUpIcon, RotateCwIcon } from "lucide-solid";
import { createSignal, onCleanup } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { MessageScroller, MessageScrollerProvider } from "@/registry/kobalte/ui/message-scroller";
import { DemoCard, type DemoMessage, Transcript, transcript } from "./message-scroller-utils";

const answer =
  "Auto-scroll follows this reply only while the reader remains at the live edge. Scroll away, and new chunks arrive without moving the viewport.";

export default function MessageScrollerStreaming() {
  const [messages, setMessages] = createSignal<DemoMessage[]>(transcript.slice(0, 2));
  const [streaming, setStreaming] = createSignal(false);
  let timer: number | undefined;
  onCleanup(() => timer && window.clearInterval(timer));
  const stream = () => {
    if (streaming()) return;
    setStreaming(true);
    setMessages((current) => [
      ...current,
      {
        id: "stream-question",
        role: "user",
        text: "Show me a live response without pulling me away from what I am reading.",
      },
      { id: "stream-answer", role: "assistant", text: "" },
    ]);
    let index = 0;
    timer = window.setInterval(() => {
      index += 8;
      setMessages((current) =>
        current.map((message) =>
          message.id === "stream-answer" ? { ...message, text: answer.slice(0, index) } : message,
        ),
      );
      if (index >= answer.length) {
        window.clearInterval(timer);
        timer = undefined;
        setStreaming(false);
      }
    }, 60);
  };
  return (
    <MessageScrollerProvider autoScroll>
      <DemoCard
        title="Streaming Messages"
        description="The live edge follows streamed output until the reader opts out."
        footer={
          <div class="flex w-full justify-between">
            <Button
              variant="outline"
              size="icon"
              aria-label="Reset stream"
              disabled={streaming()}
              onClick={() => setMessages(transcript.slice(0, 2))}
            >
              <RotateCwIcon />
            </Button>
            <Button disabled={streaming()} onClick={stream}>
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
