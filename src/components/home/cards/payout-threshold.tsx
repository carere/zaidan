import { X } from "lucide-solid";
import { For } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { Progress } from "@/registry/kobalte/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Textarea } from "@/registry/kobalte/ui/textarea";

const CURRENCIES = [
  { label: "USD — United States Dollar", value: "usd" },
  { label: "EUR — Euro", value: "eur" },
  { label: "GBP — British Pound", value: "gbp" },
  { label: "JPY — Japanese Yen", value: "jpy" },
];

export function PayoutThreshold() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Threshold</CardTitle>
        <CardDescription>
          Set the minimum balance required before a payout is triggered.
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            class="bg-muted"
            aria-label="Dismiss payout threshold"
          >
            <X />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel for="preferred-currency">Preferred Currency</FieldLabel>
            <Select items={CURRENCIES} defaultValue={CURRENCIES[0].value}>
              <SelectTrigger id="preferred-currency" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <For each={CURRENCIES}>
                  {(currency) => <SelectItem value={currency.value}>{currency.label}</SelectItem>}
                </For>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <div class="flex items-baseline justify-between">
              <FieldLabel id="min-payout-label">Minimum Payout Amount</FieldLabel>
              <span class="font-semibold text-2xl tabular-nums">$2500.00</span>
            </div>
            <Progress
              value={25}
              aria-labelledby="min-payout-label"
              aria-valuetext="$2,500 of $10,000"
            />
            <div class="flex items-center justify-between">
              <FieldDescription>$50 (MIN)</FieldDescription>
              <FieldDescription>$10,000 (MAX)</FieldDescription>
            </div>
          </Field>
          <Field>
            <FieldLabel for="payout-notes">Notes</FieldLabel>
            <Textarea
              id="payout-notes"
              placeholder="Add any notes for this payout configuration..."
              class="min-h-[100px]"
            />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button class="w-full">Save Threshold</Button>
      </CardFooter>
    </Card>
  );
}
