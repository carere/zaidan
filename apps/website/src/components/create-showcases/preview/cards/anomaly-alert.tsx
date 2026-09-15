import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent } from "@/registry/kobalte/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/registry/kobalte/ui/empty";

export function AnomalyAlert() {
  return (
    <Card>
      <CardContent>
        <Empty class="h-48">
          <EmptyHeader>
            <EmptyTitle>Get alerted for anomalies</EmptyTitle>
            <EmptyDescription>
              Automatically monitor your projects for anomalies and get notified.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>Upgrade to Observability Plus</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  );
}
