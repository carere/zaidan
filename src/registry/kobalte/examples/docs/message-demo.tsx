import { Bot, Check } from "lucide-solid";

import { Example, ExampleWrapper } from "@/components/example";
import { Avatar, AvatarFallback } from "@/registry/kobalte/ui/avatar";
import { Bubble, BubbleContent, BubbleGroup } from "@/registry/kobalte/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/registry/kobalte/ui/message";

export default function MessageDemo() {
  return (
    <ExampleWrapper>
      <Example title="Message">
        <div class="flex w-full max-w-md flex-col gap-6">
          <Message align="end">
            <MessageContent>
              <Bubble>
                <BubbleContent>Deploying to prod real quick.</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
          <Message>
            <MessageAvatar>
              <Avatar>
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
      </Example>
      <Example title="Group">
        <MessageGroup>
          <Message>
            <MessageContent>
              <BubbleGroup>
                <Bubble variant="muted">
                  <BubbleContent>I checked the registry addresses.</BubbleContent>
                </Bubble>
                <Bubble variant="muted">
                  <BubbleContent>The component is ready to install.</BubbleContent>
                </Bubble>
              </BubbleGroup>
            </MessageContent>
          </Message>
        </MessageGroup>
      </Example>
      <Example title="Header and footer">
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
              Just now <Check class="ml-2 size-3" />
            </MessageFooter>
          </MessageContent>
        </Message>
      </Example>
    </ExampleWrapper>
  );
}
