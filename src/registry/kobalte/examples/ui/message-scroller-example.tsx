import { ArrowUp, Square } from "lucide-solid";
import { createSignal, For, onCleanup, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { Example, ExampleWrapper } from "@/components/example";
import { Bubble, BubbleContent } from "@/registry/kobalte/ui/bubble";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/registry/kobalte/ui/input-group";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/registry/kobalte/ui/message-scroller";
import { Spinner } from "@/registry/kobalte/ui/spinner";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type ScriptedTurn = {
  answer: string;
  delayMs: number;
  question: string;
};

const initialMessages: ChatMessage[] = [
  { id: "hello", role: "user", text: "Hello there!" },
  { id: "greeting", role: "assistant", text: "Hey, how's it going?" },
  {
    id: "prototype",
    role: "user",
    text: "I'm prototyping an AI chat surface for our product docs. Can you sketch a sensible component breakdown and call out anything I'd regret baking into v1?",
  },
  {
    id: "layout",
    role: "assistant",
    text: "Treat the chat as three layers: a shell for the title and status, a scrolling transcript, and a composer. Keep the transport beside the demo, let the transcript own its vertical rhythm, and pin streaming output only while the reader is at the live edge.",
  },
];

const scriptedTurns: ScriptedTurn[] = [
  {
    delayMs: 2_000,
    question: "What about message spacing when one reply is short and the next is really long?",
    answer:
      "Use a consistent gap on the message list so short and long turns sit on the same grid. Keep a long assistant reply in one bubble instead of splitting each paragraph into a separate row; the transcript stays much easier to scan.",
  },
  {
    delayMs: 1_000,
    question: "Thanks, that helps.",
    answer: "Happy to help — send another message when you're ready to continue the demo.",
  },
];

export default function MessageScrollerExample() {
  return (
    <ExampleWrapper>
      <MessageScrollerDemo />
    </ExampleWrapper>
  );
}

function MessageScrollerDemo() {
  // A store keeps each message's DOM node stable while its text streams in;
  // replacing the array objects would tear down and recreate the live bubble.
  const [messages, setMessages] = createStore(initialMessages.slice());
  const [nextTurn, setNextTurn] = createSignal(0);
  const [status, setStatus] = createSignal<"ready" | "submitted" | "streaming">("ready");
  let responseTimer: ReturnType<typeof setTimeout> | undefined;
  let streamTimer: ReturnType<typeof setInterval> | undefined;

  onCleanup(() => {
    if (responseTimer) clearTimeout(responseTimer);
    if (streamTimer) clearInterval(streamTimer);
  });

  const isBusy = () => status() === "submitted" || status() === "streaming";
  const pendingTurn = () => scriptedTurns[nextTurn()];

  const streamResponse = (turn: ScriptedTurn, turnNumber: number) => {
    const chunks = turn.answer.match(/\S+\s*/g) ?? [turn.answer];
    let chunkIndex = 0;
    const messageId = `answer-${turnNumber}`;

    setMessages(produce((current) => current.push({ id: messageId, role: "assistant", text: "" })));
    setStatus("streaming");

    streamTimer = setInterval(() => {
      const chunk = chunks[chunkIndex];
      if (chunk) {
        setMessages(
          (message) => message.id === messageId,
          "text",
          (text) => `${text}${chunk}`,
        );
        chunkIndex += 1;
      }

      if (chunkIndex < chunks.length) return;

      clearInterval(streamTimer);
      streamTimer = undefined;
      setStatus("ready");
    }, 10);
  };

  const sendNextMessage = () => {
    const turn = pendingTurn();
    if (!turn || isBusy()) return;

    const turnNumber = nextTurn() + 1;
    setMessages(
      produce((current) =>
        current.push({ id: `question-${turnNumber}`, role: "user", text: turn.question }),
      ),
    );
    setNextTurn(turnNumber);
    setStatus("submitted");

    responseTimer = setTimeout(() => {
      responseTimer = undefined;
      streamResponse(turn, turnNumber);
    }, turn.delayMs);
  };

  const stop = () => {
    if (responseTimer) clearTimeout(responseTimer);
    if (streamTimer) clearInterval(streamTimer);
    responseTimer = undefined;
    streamTimer = undefined;
    setStatus("ready");
  };

  return (
    <Example title="Chat" containerClass="self-start">
      <Card class="h-140">
        <CardHeader>
          <CardTitle>How can I help you today?</CardTitle>
          <CardDescription>Status: {status()}</CardDescription>
        </CardHeader>
        <CardContent class="min-h-0 flex-1 overflow-hidden p-0">
          <MessageScrollerProvider autoScroll>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent aria-busy={isBusy()} class="gap-4 p-(--card-spacing)">
                  <For each={messages}>
                    {(message) => (
                      <MessageScrollerItem
                        messageId={message.id}
                        scrollAnchor={message.role === "user"}
                        class={message.role === "user" ? "flex justify-end" : undefined}
                      >
                        <Bubble
                          align={message.role === "user" ? "end" : "start"}
                          variant={message.role === "user" ? "default" : "muted"}
                        >
                          <BubbleContent class="whitespace-pre-wrap">{message.text}</BubbleContent>
                        </Bubble>
                      </MessageScrollerItem>
                    )}
                  </For>
                  <Show when={status() === "submitted"}>
                    <MessageScrollerItem scrollAnchor={false}>
                      <div
                        class="flex items-center gap-2 text-muted-foreground text-sm"
                        role="status"
                      >
                        <Spinner />
                        Thinking...
                      </div>
                    </MessageScrollerItem>
                  </Show>
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        </CardContent>
        <CardFooter>
          <form
            class="w-full"
            onSubmit={(event) => {
              event.preventDefault();
              sendNextMessage();
            }}
          >
            <InputGroup>
              <InputGroupTextarea
                placeholder="Ask me anything..."
                class="h-10 min-h-10 overflow-y-auto"
                value={isBusy() ? "" : (pendingTurn()?.question ?? "")}
                readOnly
              />
              <InputGroupAddon align="block-end" class="p-2">
                <Show
                  when={isBusy()}
                  fallback={
                    <InputGroupButton
                      variant="default"
                      size="icon-sm"
                      type="submit"
                      disabled={!pendingTurn()}
                      class="ml-auto"
                    >
                      <ArrowUp />
                      <span class="sr-only">Send</span>
                    </InputGroupButton>
                  }
                >
                  <InputGroupButton size="icon-sm" type="button" class="ml-auto" onClick={stop}>
                    <Square />
                    <span class="sr-only">Stop</span>
                  </InputGroupButton>
                </Show>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </CardFooter>
      </Card>
    </Example>
  );
}
