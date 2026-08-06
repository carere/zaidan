import {
  MessageScroller,
  MessageScrollerProvider,
  useMessageScrollerScrollable,
} from "@/registry/kobalte/ui/message-scroller";
import { DemoCard, type DemoMessage, Transcript } from "./message-scroller-utils";

const messages: DemoMessage[] = Array.from({ length: 12 }, (_, index) => ({
  id: `scrollable-${index + 1}`,
  role: index % 2 === 0 ? "user" : "assistant",
  text:
    index % 2 === 0
      ? `Review scroll checkpoint ${index + 1}.`
      : `Checkpoint ${index + 1} is synced. The scrollable hook updates as the viewport moves.\n\nAt either edge, the footer tells the reader which direction remains available.`,
}));

export default function MessageScrollerScrollable() {
  return (
    <MessageScrollerProvider defaultScrollPosition="start">
      <DemoCard
        title="Scroll Status"
        description="Read which edge the viewport can still scroll toward."
        footer={<ScrollStatus />}
      >
        <MessageScroller>
          <Transcript messages={messages} anchor={(message) => message.role === "user"} />
        </MessageScroller>
      </DemoCard>
    </MessageScrollerProvider>
  );
}

function ScrollStatus() {
  const { start, end } = useMessageScrollerScrollable();
  const text = () =>
    start && end
      ? "You can scroll both ways."
      : end
        ? "You are at the top. You can only scroll down."
        : start
          ? "You are at the bottom. You can only scroll up."
          : "All messages fit in the viewport.";
  return <p class="w-full text-center text-sm text-muted-foreground">{text()}</p>;
}
