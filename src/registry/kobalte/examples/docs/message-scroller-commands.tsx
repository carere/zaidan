import { For } from "solid-js";
import { MessageScroller, useMessageScroller } from "@/registry/kobalte/blocks/message-scroller";
import { Button } from "@/registry/kobalte/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import { DemoCard, Transcript, transcript } from "./message-scroller-utils";

export default function MessageScrollerCommands() {
  return (
    <MessageScroller.Provider defaultScrollPosition="end">
      <DemoCard
        title="Commands"
        description="Drive the transcript from controls outside the message list."
      >
        <CommandMenu />
        <MessageScroller.Root>
          <Transcript anchor={(message) => message.role === "user"} />
        </MessageScroller.Root>
      </DemoCard>
    </MessageScroller.Provider>
  );
}

function CommandMenu() {
  const { scrollToMessage } = useMessageScroller();
  const questions = transcript.filter((message) => message.role === "user");
  return (
    <div class="absolute z-10 mt-3 ml-3">
      <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger as={Button} variant="secondary" class="w-fit">
          Jump to...
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-64">
          <DropdownMenuLabel>Conversation</DropdownMenuLabel>
          <For each={questions}>
            {(message) => (
              <DropdownMenuItem
                onSelect={() => scrollToMessage(message.id, { align: "start", behavior: "smooth" })}
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
