import {
  ArrowUpIcon,
  GlobeIcon,
  ImageIcon,
  MessageCircleDashedIcon,
  PaperclipIcon,
  PlusIcon,
  RotateCwIcon,
  TelescopeIcon,
} from "lucide-solid";
import { For, Show } from "solid-js";
import { MessageScroller } from "@/registry/kobalte/blocks/message-scroller";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/kobalte/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton } from "@/registry/kobalte/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";
import {
  createScriptedChat,
  MessageAnimated,
  scrollBehaviorScript,
} from "./message-scroller-utils";

export default function MessageScrollerDemo() {
  const chat = createScriptedChat({ delayMs: 20, script: scrollBehaviorScript });

  return (
    <MessageScroller.Provider>
      <div class="relative flex flex-col gap-4">
        <Card class="mx-auto h-140 w-full max-w-sm gap-0">
          <CardHeader class="gap-1 border-b">
            <CardTitle>New Chat</CardTitle>
            <CardDescription>How can I help you today?</CardDescription>
            <CardAction>
              <Tooltip>
                <TooltipTrigger as="span" class="inline-block w-fit">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Reset conversation"
                    disabled={chat.messages.length === 0 || chat.isBusy()}
                    onClick={chat.reset}
                  >
                    <RotateCwIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset</p>
                </TooltipContent>
              </Tooltip>
            </CardAction>
          </CardHeader>
          <CardContent class="min-h-0 flex-1 overflow-hidden p-0">
            <Show
              when={chat.messages.length > 0}
              fallback={
                <Empty class="h-full">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MessageCircleDashedIcon />
                    </EmptyMedia>
                    <EmptyTitle>Morning, zaidan!</EmptyTitle>
                    <EmptyDescription>
                      What are we working on today? Press send to start a new conversation
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              }
            >
              <MessageScroller.Root>
                <MessageScroller.Viewport>
                  <MessageScroller.Content aria-busy={chat.isBusy()} class="p-(--card-spacing)">
                    <For each={chat.messages}>
                      {(message) => <MessageAnimated message={message} />}
                    </For>
                  </MessageScroller.Content>
                </MessageScroller.Viewport>
                <MessageScroller.Button />
              </MessageScroller.Root>
            </Show>
          </CardContent>
          <CardFooter class="flex-col gap-2">
            <form
              class="w-full"
              onSubmit={(event) => {
                event.preventDefault();
                chat.send();
              }}
            >
              <InputGroup>
                <div class="h-14 w-full px-3 py-2.5">
                  <span
                    class="line-clamp-2 opacity-60 data-[status=ready]:opacity-100"
                    data-status={chat.status()}
                  >
                    <Show
                      when={chat.nextMessage()}
                      keyed
                      fallback={
                        <span class="text-muted-foreground">
                          No messages queued. Reset the conversation.
                        </span>
                      }
                    >
                      {(message) => message.text}
                    </Show>
                  </span>
                </div>
                <InputGroupAddon align="block-end" class="pt-1">
                  <DropdownMenu placement="top-start">
                    <DropdownMenuTrigger
                      as={InputGroupButton}
                      aria-label="Add files"
                      type="button"
                      size="icon-sm"
                      variant="outline"
                    >
                      <PlusIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent class="w-44">
                      <DropdownMenuItem>
                        <PaperclipIcon />
                        Add Photos & Files
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <ImageIcon />
                        Create Image
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <TelescopeIcon />
                        Deep Research
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <GlobeIcon />
                        Web Search
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <InputGroupButton
                    type="submit"
                    variant="default"
                    size="icon-sm"
                    disabled={!chat.nextMessage() || chat.isBusy()}
                    class="ml-auto"
                  >
                    <ArrowUpIcon />
                    <span class="sr-only">Send</span>
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>
          </CardFooter>
        </Card>
        <div class="px-0.5 text-center text-muted-foreground text-xs">
          Demo is read only. Press send to send messages.
        </div>
      </div>
    </MessageScroller.Provider>
  );
}
