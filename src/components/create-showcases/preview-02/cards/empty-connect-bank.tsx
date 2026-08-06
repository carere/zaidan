import { CreditCard } from "lucide-solid";
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

export function EmptyConnectBank() {
  return (
    <Card>
      <CardContent>
        <Empty class="p-4">
          <EmptyMedia variant="icon">
            <CreditCard />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Connect Bank</EmptyTitle>
            <EmptyDescription>
              Link your payout method to receive monthly royalty distributions automatically.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>Set Up Payouts</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  );
}
