import { Button } from "@/registry/kobalte/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/registry/kobalte/ui/hover-card";

export default function HoverCardDemo() {
  return (
    <HoverCard openDelay={10} closeDelay={100}>
      <HoverCardTrigger as={Button} variant="link">
        Hover Here
      </HoverCardTrigger>
      <HoverCardContent class="flex w-64 flex-col gap-0.5">
        <div class="font-semibold">@nextjs</div>
        <div>The React Framework – created and maintained by @vercel.</div>
        <div class="mt-1 text-muted-foreground text-xs">Joined December 2021</div>
      </HoverCardContent>
    </HoverCard>
  );
}
