import { ArrowUpIcon, RotateCwIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { MessageScroller, MessageScrollerProvider } from "@/registry/kobalte/ui/message-scroller";
import { ToggleGroup, ToggleGroupItem } from "@/registry/kobalte/ui/toggle-group";
import { DemoCard, type DemoMessage, Transcript, transcript } from "./message-scroller-utils";

const extraTurns: DemoMessage[] = [
  { id: "anchor-question", role: "user", text: "What changes when the other role starts a turn?" },
  {
    id: "anchor-answer",
    role: "assistant",
    text: "The next appended item with the selected role settles near the top edge of the viewport.",
  },
];

export default function MessageScrollerAnchoring() {
  const [anchorRole, setAnchorRole] = createSignal<DemoMessage["role"]>("user");
  const [messages, setMessages] = createSignal(transcript.slice(0, 2));

  return (
    <MessageScrollerProvider>
      <DemoCard
        title="Anchoring Turns"
        description="Choose which role starts the next visible turn."
        footer={
          <div class="flex w-full items-center gap-2">
            <ToggleGroup
              aria-label="Select scroll anchor role"
              value={anchorRole()}
              onChange={(value) => {
                if (value === "user" || value === "assistant") {
                  setAnchorRole(value);
                  setMessages(transcript.slice(0, 2));
                }
              }}
            >
              <ToggleGroupItem value="user">User</ToggleGroupItem>
              <ToggleGroupItem value="assistant">Assistant</ToggleGroupItem>
            </ToggleGroup>
            <Button
              class="ml-auto"
              variant="outline"
              size="icon"
              aria-label="Reset anchored turns"
              onClick={() => setMessages(transcript.slice(0, 2))}
            >
              <RotateCwIcon />
            </Button>
            <Button
              size="icon"
              disabled={messages().length > 2}
              onClick={() => setMessages((current) => [...current, ...extraTurns])}
            >
              <ArrowUpIcon />
              <span class="sr-only">Send Message</span>
            </Button>
          </div>
        }
      >
        <MessageScroller>
          <Transcript messages={messages()} anchor={(message) => message.role === anchorRole()} />
        </MessageScroller>
      </DemoCard>
    </MessageScrollerProvider>
  );
}
