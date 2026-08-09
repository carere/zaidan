import { children, For, type JSX, type ParentProps } from "solid-js";
import { MessageScroller } from "@/registry/kobalte/blocks/message-scroller";
import { Bubble, BubbleContent } from "@/registry/kobalte/ui/bubble";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";

export type DemoMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

export const transcript: DemoMessage[] = [
  {
    id: "brief",
    role: "user",
    text: "Review the incident handoff and tell me what to read first.",
  },
  {
    id: "summary",
    role: "assistant",
    text: "Start with the summary and impact. The upload queue recovered for every queued job, but the transcript still needs a clear handoff.",
  },
  { id: "impact", role: "user", text: "What was the customer impact?" },
  {
    id: "details",
    role: "assistant",
    text: "Impact was limited to delayed processing. No records were dropped, and reconciliation confirmed every retry batch.\n\nKeep the retry window enabled until the next deploy, then add a sustained queue-depth alert.",
  },
  { id: "actions", role: "user", text: "Give me the follow-up checklist." },
  {
    id: "checklist",
    role: "assistant",
    text: "Compare recovery with the deploy timeline, assign owners to the retry window and alert tuning, and keep support updated with the same customer-facing summary.",
  },
];

export function DemoCard(
  props: ParentProps<{
    description: string;
    footer?: JSX.Element;
    title: string;
  }>,
) {
  const content = children(() => props.children);
  const footer = children(() => props.footer);

  return (
    <div class="mx-auto flex w-full max-w-sm flex-col gap-4">
      <Card class="h-140 w-full gap-0 overflow-hidden">
        <CardHeader class="gap-1 border-b">
          <CardTitle>{props.title}</CardTitle>
          <CardDescription>{props.description}</CardDescription>
        </CardHeader>
        <CardContent class="min-h-0 flex-1 overflow-hidden p-0">{content()}</CardContent>
        {footer() && <CardFooter class="border-t">{footer()}</CardFooter>}
      </Card>
    </div>
  );
}

export function Transcript(props: {
  anchor?: (message: DemoMessage) => boolean;
  itemClass?: (message: DemoMessage) => string | undefined;
  messages?: DemoMessage[];
}) {
  return (
    <MessageScroller.Viewport>
      <MessageScroller.Content class="gap-4 p-(--card-spacing)">
        <For each={props.messages ?? transcript}>
          {(message) => (
            <TranscriptItem
              message={message}
              scrollAnchor={props.anchor?.(message)}
              class={props.itemClass?.(message)}
            />
          )}
        </For>
      </MessageScroller.Content>
      <MessageScroller.Button />
    </MessageScroller.Viewport>
  );
}

export function TranscriptItem(props: {
  class?: string;
  message: DemoMessage;
  scrollAnchor?: boolean;
}) {
  const paragraphs = () => props.message.text.split(/\n\s*\n/).filter(Boolean);
  const isUser = () => props.message.role === "user";

  return (
    <MessageScroller.Item
      messageId={props.message.id}
      scrollAnchor={props.scrollAnchor}
      class={isUser() ? `flex justify-end ${props.class ?? ""}` : props.class}
    >
      <Bubble variant={isUser() ? "muted" : "ghost"}>
        <BubbleContent class="space-y-2">
          <For each={paragraphs()}>
            {(paragraph) => <p class="whitespace-pre-wrap">{paragraph}</p>}
          </For>
        </BubbleContent>
      </Bubble>
    </MessageScroller.Item>
  );
}
