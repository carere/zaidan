import { CheckCircle2 } from "lucide-solid";
import { For } from "solid-js";
import { Alert, AlertDescription } from "@/registry/kobalte/ui/alert";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/registry/kobalte/ui/item";

// Agent feature descriptions.
const agentFeatures = [
  {
    id: "code-reviews",
    content: (
      <>
        <strong>Code reviews</strong> with full codebase context to catch{" "}
        <strong>hard-to-find</strong> bugs.
      </>
    ),
  },
  {
    id: "code-suggestions",
    content: (
      <>
        <strong>Code suggestions</strong> validated in sandboxes before you merge.
      </>
    ),
  },
  {
    id: "root-cause",
    content: (
      <>
        <strong>Root-cause analysis</strong> for production issues with deployment context.{" "}
        <Badge variant="secondary" class="bg-chart-1 text-chart-5">
          Requires Observability Plus
        </Badge>
      </>
    ),
  },
];

export function ActivateAgentDialog() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ship faster & safer with Vercel Agent</CardTitle>
        <CardDescription>
          Your use is subject to Vercel&apos;s <a href="/">Public Beta Agreement</a> and{" "}
          <a href="/">AI Product Terms</a>.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <ItemGroup role="group" class="gap-0">
          <For each={agentFeatures}>
            {(feature) => (
              <Item size="xs" class="px-0">
                <ItemMedia variant="icon" class="self-start">
                  <CheckCircle2 class="size-5 fill-primary text-primary-foreground" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle class="inline leading-relaxed font-normal text-muted-foreground *:[strong]:font-medium *:[strong]:text-foreground">
                    {feature.content}
                  </ItemTitle>
                </ItemContent>
              </Item>
            )}
          </For>
        </ItemGroup>
        <Alert>
          <AlertDescription>
            Pro teams get $100 in Vercel Agent trial credit for 2 weeks after activation.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter class="justify-end gap-2">
        <Button variant="outline" class="style-sera:hidden">
          Cancel
        </Button>
        <Button class="style-sera:w-full">Enable with $100 credits</Button>
      </CardFooter>
    </Card>
  );
}
