import { ArrowUpIcon, RotateCwIcon } from "lucide-solid";
import { createSignal, onCleanup } from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { MessageScroller } from "@/registry/kobalte/blocks/message-scroller";
import { Button } from "@/registry/kobalte/ui/button";
import { DemoCard, type DemoMessage, Transcript, transcript } from "./message-scroller-utils";

const answer =
  "Auto-scroll follows this reply only while the reader remains at the live edge. Scroll away, and new chunks arrive without moving the viewport.";

export default function MessageScrollerStreaming() {
  // A store keeps each message's DOM node stable while its text streams in;
  // replacing the array objects would tear down and recreate the live bubble.
  const [messages, setMessages] = createStore<DemoMessage[]>(transcript.slice(0, 2));
  const [streaming, setStreaming] = createSignal(false);
  let timer: number | undefined;
  onCleanup(() => timer && window.clearInterval(timer));
  const stream = () => {
    if (streaming()) return;
    setStreaming(true);
    setMessages(
      produce((current) => {
        current.push(
          {
            id: "stream-question",
            role: "user",
            text: "Show me a live response without pulling me away from what I am reading.",
          },
          { id: "stream-answer", role: "assistant", text: "" },
        );
      }),
    );
    let index = 0;
    timer = window.setInterval(() => {
      index += 8;
      setMessages((message) => message.id === "stream-answer", "text", answer.slice(0, index));
      if (index >= answer.length) {
        window.clearInterval(timer);
        timer = undefined;
        setStreaming(false);
      }
    }, 60);
  };
  return (
    <MessageScroller.Provider autoScroll>
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
              onClick={() => setMessages(reconcile(transcript.slice(0, 2)))}
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
        <MessageScroller.Root>
          <Transcript messages={messages} anchor={(message) => message.role === "user"} />
        </MessageScroller.Root>
      </DemoCard>
    </MessageScroller.Provider>
  );
}
