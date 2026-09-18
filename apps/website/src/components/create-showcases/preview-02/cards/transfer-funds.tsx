import { X } from "lucide-solid";
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
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/registry/kobalte/ui/input-group";
import { Item, ItemContent } from "@/registry/kobalte/ui/item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Separator } from "@/registry/kobalte/ui/separator";

const FROM_ACCOUNTS = [
  { label: "Main Checking (··8402) — $12,450.00", value: "checking" },
  { label: "Business (··7731) — $8,920.00", value: "business" },
];

const TO_ACCOUNTS = [
  { label: "High Yield Savings (··1192) — $42,100.00", value: "savings" },
  { label: "Investment (··3349) — $18,200.00", value: "investment" },
];

export function TransferFunds() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Funds</CardTitle>
        <CardDescription>Move money between your connected accounts.</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            class="bg-muted"
            aria-label="Dismiss transfer funds"
          >
            <X />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel for="transfer-amount">Amount to Transfer</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>$</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput id="transfer-amount" defaultValue="1,200.00" />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel for="from-account">From Account</FieldLabel>
            <Select
              options={FROM_ACCOUNTS}
              optionValue="value"
              optionTextValue="label"
              defaultValue={FROM_ACCOUNTS[0]}
              itemComponent={(itemProps) => (
                <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
              )}
            >
              <SelectTrigger id="from-account" class="w-full">
                <SelectValue<(typeof FROM_ACCOUNTS)[number]>>
                  {(state) => state.selectedOption().label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent />
            </Select>
          </Field>
          <Field>
            <FieldLabel for="to-account">To Account</FieldLabel>
            <Select
              options={TO_ACCOUNTS}
              optionValue="value"
              optionTextValue="label"
              defaultValue={TO_ACCOUNTS[0]}
              itemComponent={(itemProps) => (
                <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
              )}
            >
              <SelectTrigger id="to-account" class="w-full">
                <SelectValue<(typeof TO_ACCOUNTS)[number]>>
                  {(state) => state.selectedOption().label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent />
            </Select>
          </Field>
          <Item variant="muted" class="flex-col items-stretch">
            <ItemContent class="gap-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-muted-foreground">Estimated arrival</span>
                <span class="text-sm font-medium">Today, Apr 14</span>
              </div>
              <Separator />
              <div class="flex items-center justify-between">
                <span class="text-sm text-muted-foreground">Transaction fee</span>
                <span class="text-sm font-medium tabular-nums">$0.00</span>
              </div>
              <Separator />
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Total amount</span>
                <span class="text-sm font-semibold tabular-nums">$1,200.00</span>
              </div>
            </ItemContent>
          </Item>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button class="w-full">Confirm Transfer</Button>
      </CardFooter>
    </Card>
  );
}
