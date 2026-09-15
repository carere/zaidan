import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent } from "@/registry/kobalte/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/kobalte/ui/empty";
import { Spinner } from "@/registry/kobalte/ui/spinner";

export function SyncingState() {
  return (
    <Card>
      <CardContent class="p-0">
        <Empty class="p-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Spinner />
            </EmptyMedia>
            <EmptyTitle>Syncing your accounts</EmptyTitle>
            <EmptyDescription>
              We&apos;re pulling in your latest transactions. This usually takes a few seconds.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline">Cancel</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  );
}
