import { RotateCwIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { MessageScroller, MessageScrollerProvider } from "@/registry/kobalte/ui/message-scroller";
import { DemoCard, Transcript, transcript } from "./message-scroller-utils";

export default function MessageScrollerLoadHistory() {
  const [visibleCount, setVisibleCount] = createSignal(3);
  const visible = () => transcript.slice(-visibleCount());
  const loaded = () => visibleCount() === transcript.length;
  return (
    <MessageScrollerProvider>
      <DemoCard
        title="Load History"
        description="Prepending rows preserves the conversation already in view."
        footer={
          <div class="flex w-full gap-2">
            <Button
              class="flex-1"
              variant="secondary"
              disabled={loaded()}
              onClick={() => setVisibleCount(transcript.length)}
            >
              {loaded() ? "History Loaded" : "Load History"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Reset loaded messages"
              disabled={!loaded()}
              onClick={() => setVisibleCount(3)}
            >
              <RotateCwIcon />
            </Button>
          </div>
        }
      >
        <MessageScroller>
          <Transcript messages={visible()} />
        </MessageScroller>
      </DemoCard>
    </MessageScrollerProvider>
  );
}
