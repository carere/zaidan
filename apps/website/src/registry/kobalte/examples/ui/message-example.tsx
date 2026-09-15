import { Bot, Check, MoreHorizontal } from "lucide-solid";

import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Bubble, BubbleContent, BubbleGroup } from "@/registry/kobalte/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/registry/kobalte/ui/message";

export default function MessageExample() {
  return (
    <div class="flex w-full max-w-2xl flex-col gap-8 p-4">
      <section class="flex flex-col gap-3">
        <h2 class="font-heading text-sm font-medium">Message</h2>
        <div class="flex w-full max-w-md flex-col gap-6">
          <Message align="end">
            <MessageContent>
              <Bubble>
                <BubbleContent>Deploying to prod real quick.</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
          <Message>
            <MessageContent>
              <Bubble variant="muted">
                <BubbleContent>It's 4:55 PM. On a Friday.</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
          <Message>
            <MessageAvatar>
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="Shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </MessageAvatar>
            <MessageContent>
              <Bubble variant="muted">
                <BubbleContent>Something went wrong. Any idea?</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="font-heading text-sm font-medium">Grouped messages</h2>
        <MessageGroup>
          <Message>
            <MessageContent>
              <BubbleGroup>
                <Bubble variant="muted">
                  <BubbleContent>I checked the registry addresses.</BubbleContent>
                </Bubble>
                <Bubble variant="muted">
                  <BubbleContent>
                    The component and example now live under the UI registry.
                  </BubbleContent>
                </Bubble>
              </BubbleGroup>
            </MessageContent>
          </Message>
          <Message align="end">
            <MessageContent>
              <Bubble>
                <BubbleContent>Perfect, thank you.</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        </MessageGroup>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="font-heading text-sm font-medium">Header and footer</h2>
        <Message>
          <MessageAvatar>
            <span class="flex size-8 items-center justify-center rounded-full bg-muted">
              <Bot class="size-4" />
            </span>
          </MessageAvatar>
          <MessageContent>
            <MessageHeader>Assistant</MessageHeader>
            <Bubble variant="ghost">
              <BubbleContent>The deployment looks healthy.</BubbleContent>
            </Bubble>
            <MessageFooter>
              <span>Just now</span>
              <Check class="ml-2 size-3" />
              <MoreHorizontal class="ml-auto size-4" />
            </MessageFooter>
          </MessageContent>
        </Message>
      </section>
    </div>
  );
}
