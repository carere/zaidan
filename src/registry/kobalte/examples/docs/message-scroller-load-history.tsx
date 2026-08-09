import { RotateCwIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { MessageScroller } from "@/registry/kobalte/blocks/message-scroller";
import { Button } from "@/registry/kobalte/ui/button";
import { DemoCard, Transcript, transcript } from "./message-scroller-utils";

export default function MessageScrollerLoadHistory() {
  const [visibleCount, setVisibleCount] = createSignal(3);
  const visible = () => transcript.slice(-visibleCount());
  const loaded = () => visibleCount() === transcript.length;
  return (
    <MessageScroller.Provider>
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
        <MessageScroller.Root>
          <Transcript messages={visible()} />
        </MessageScroller.Root>
      </DemoCard>
    </MessageScroller.Provider>
  );
}
