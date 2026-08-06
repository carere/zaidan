import { ArrowUpIcon, RotateCwIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { MessageScroller, MessageScrollerProvider } from "@/registry/kobalte/ui/message-scroller";
import { DemoCard, type DemoMessage, Transcript, transcript } from "./message-scroller-utils";

const animations = {
  fade: "opacity-0 animate-in fade-in duration-300",
  pop: "scale-75 animate-in zoom-in-75 duration-300",
  rise: "translate-y-4 animate-in slide-in-from-bottom-4 duration-300",
};
const newMessage: DemoMessage = {
  id: "animated-message",
  role: "user",
  text: "This message entered with transform and opacity, without changing the row layout.",
};

export default function MessageScrollerAnimation() {
  const [preset, setPreset] = createSignal<keyof typeof animations>("fade");
  const [messages, setMessages] = createSignal(transcript.slice(0, 2));
  return (
    <MessageScrollerProvider>
      <DemoCard
        title="Animation"
        description="Animate a new row with transform and opacity."
        footer={
          <div class="flex w-full items-center gap-2">
            <label class="sr-only" for="animation-preset">
              Animation preset
            </label>
            <select
              id="animation-preset"
              class="h-9 rounded-md border bg-background px-2 text-sm"
              value={preset()}
              onChange={(event) => setPreset(event.currentTarget.value as keyof typeof animations)}
            >
              <option value="fade">Fade</option>
              <option value="pop">Pop</option>
              <option value="rise">Rise</option>
            </select>
            <Button
              class="ml-auto"
              variant="outline"
              size="icon"
              aria-label="Reset animated messages"
              onClick={() => setMessages(transcript.slice(0, 2))}
            >
              <RotateCwIcon />
            </Button>
            <Button
              size="icon"
              disabled={messages().length > 2}
              onClick={() => setMessages((current) => [...current, newMessage])}
            >
              <ArrowUpIcon />
              <span class="sr-only">Send Message</span>
            </Button>
          </div>
        }
      >
        <MessageScroller>
          <Transcript
            messages={messages()}
            anchor={(message) => message.role === "user"}
            itemClass={(message) =>
              message.id === newMessage.id ? animations[preset()] : undefined
            }
          />
        </MessageScroller>
      </DemoCard>
    </MessageScrollerProvider>
  );
}
