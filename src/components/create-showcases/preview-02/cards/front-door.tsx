import { Lock } from "lucide-solid";
import { Badge } from "@/registry/kobalte/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";

export function FrontDoor() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Front Door</CardTitle>
        <CardDescription>Smart Lock Pro</CardDescription>
        <CardAction>
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            Locked
            <Lock class="size-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div class="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,var(--border)_10px,var(--border)_11px)]">
          <Badge variant="destructive" class="absolute top-2 right-2">
            Live
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
