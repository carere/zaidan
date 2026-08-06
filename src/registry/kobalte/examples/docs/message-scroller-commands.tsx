import { For } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import {
  MessageScroller,
  MessageScrollerProvider,
  useMessageScroller,
} from "@/registry/kobalte/ui/message-scroller";
import { DemoCard, Transcript, transcript } from "./message-scroller-utils";

export default function MessageScrollerCommands() {
  return (
    <MessageScrollerProvider defaultScrollPosition="end">
      <DemoCard
        title="Commands"
        description="Drive the transcript from controls outside the message list."
      >
        <CommandMenu />
        <MessageScroller>
          <Transcript anchor={(message) => message.role === "user"} />
        </MessageScroller>
      </DemoCard>
    </MessageScrollerProvider>
  );
}

function CommandMenu() {
  const { scrollToMessage } = useMessageScroller();
  const questions = transcript.filter((message) => message.role === "user");
  return (
    <div class="absolute z-10 mt-3 ml-3">
      <DropdownMenu>
        <DropdownMenuTrigger as={Button} variant="secondary" class="w-fit">
          Jump to...
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-64">
          <DropdownMenuLabel>Conversation</DropdownMenuLabel>
          <For each={questions}>
            {(message) => (
              <DropdownMenuItem
                onClick={() => scrollToMessage(message.id, { align: "start", behavior: "smooth" })}
              >
                {message.text}
              </DropdownMenuItem>
            )}
          </For>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
