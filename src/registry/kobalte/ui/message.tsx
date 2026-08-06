import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type MessageGroupProps = ComponentProps<"div">;

const MessageGroup = (props: MessageGroupProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="message-group"
      class={cn("z-message-group flex min-w-0 flex-col", local.class)}
      {...others}
    />
  );
};

type MessageProps = ComponentProps<"div"> & { align?: "start" | "end" };

const Message = (props: MessageProps) => {
  const [local, others] = splitProps(props, ["align", "class"]);
  const align = () => local.align ?? "start";
  return (
    <div
      data-slot="message"
      data-align={align()}
      class={cn(
        "z-message group/message relative flex w-full min-w-0 data-[align=end]:flex-row-reverse",
        local.class,
      )}
      {...others}
    />
  );
};

type MessageAvatarProps = ComponentProps<"div">;

const MessageAvatar = (props: MessageAvatarProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="message-avatar"
      class={cn(
        "z-message-avatar flex w-fit shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted",
        local.class,
      )}
      {...others}
    />
  );
};

type MessageContentProps = ComponentProps<"div">;

const MessageContent = (props: MessageContentProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="message-content"
      class={cn("z-message-content flex w-full min-w-0 flex-col wrap-break-word", local.class)}
      {...others}
    />
  );
};

type MessageHeaderProps = ComponentProps<"div">;

const MessageHeader = (props: MessageHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="message-header"
      class={cn("z-message-header flex max-w-full min-w-0 items-center", local.class)}
      {...others}
    />
  );
};

type MessageFooterProps = ComponentProps<"div">;

const MessageFooter = (props: MessageFooterProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="message-footer"
      class={cn(
        "z-message-footer flex max-w-full min-w-0 items-center group-data-[align=end]/message:justify-end",
        local.class,
      )}
      {...others}
    />
  );
};

export { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader };
