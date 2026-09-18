import { MessageCircleDashed } from "lucide-solid";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";

export function MessageScrollerPlaceholder() {
  return (
    <Card class="mx-auto h-140 w-full max-w-sm border-dashed">
      <CardHeader class="border-b">
        <CardTitle>Message Scroller</CardTitle>
        <CardDescription>Reserved for the upcoming registry component.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div class="flex size-12 items-center justify-center rounded-full bg-muted">
          <MessageCircleDashed class="size-6 text-muted-foreground" />
        </div>
        <div class="max-w-56 space-y-1">
          <p class="font-medium text-sm">Replace this placeholder</p>
          <p class="text-muted-foreground text-xs">
            Add the shadcn chat card when Message Scroller lands in the Zaidan registry.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
