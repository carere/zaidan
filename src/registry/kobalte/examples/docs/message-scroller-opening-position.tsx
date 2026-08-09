import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";
import { MessageScroller, useMessageScroller } from "@/registry/kobalte/blocks/message-scroller";
import { Button } from "@/registry/kobalte/ui/button";
import { DemoCard, Transcript } from "./message-scroller-utils";

type Position = "end" | "last-anchor" | "start";

export default function MessageScrollerOpeningPosition() {
  const [position, setPosition] = createSignal<Position>("last-anchor");

  return (
    <MessageScroller.Provider defaultScrollPosition="last-anchor">
      <DemoCard
        title="Opening Position"
        description="Choose where a saved transcript opens. Reopen a thread with the selected position in your product."
        footer={
          <fieldset class="flex w-full justify-center gap-1">
            <legend class="sr-only">Opening position</legend>
            <Button
              variant={position() === "start" ? "default" : "outline"}
              onClick={() => setPosition("start")}
            >
              start
            </Button>
            <Button
              variant={position() === "end" ? "default" : "outline"}
              onClick={() => setPosition("end")}
            >
              end
            </Button>
            <Button
              variant={position() === "last-anchor" ? "default" : "outline"}
              onClick={() => setPosition("last-anchor")}
            >
              last-anchor
            </Button>
          </fieldset>
        }
      >
        <MessageScroller.Root>
          <OpeningTranscript position={position} />
        </MessageScroller.Root>
      </DemoCard>
    </MessageScroller.Provider>
  );
}

function OpeningTranscript(props: { position: Accessor<Position> }) {
  const { scrollToEnd, scrollToMessage, scrollToStart } = useMessageScroller();

  createEffect(() => {
    const position = props.position();
    const frame = window.requestAnimationFrame(() => {
      if (position === "start") scrollToStart({ behavior: "auto" });
      else if (position === "end") scrollToEnd({ behavior: "auto" });
      else scrollToMessage("impact", { align: "start", behavior: "auto", scrollMargin: 64 });
    });

    onCleanup(() => window.cancelAnimationFrame(frame));
  });

  return <Transcript anchor={(message) => message.role === "user"} />;
}
