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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import { RadioGroup, RadioGroupItem } from "@/registry/kobalte/ui/radio-group";

export function ReceivingMethod() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Payout Preferences</CardDescription>
        <CardTitle>Receiving Method</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            class="bg-muted"
            aria-label="Dismiss receiving method"
          >
            <X />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel for="account-holder">Account Holder Name</FieldLabel>
            <Input id="account-holder" defaultValue="Synthetic Horizons Music LLC" />
          </Field>
          <FieldSet>
            <FieldLegend variant="label">Receiving Method</FieldLegend>
            <RadioGroup
              defaultValue="bank"
              class="grid grid-cols-1 items-start gap-3 md:grid-cols-2 style-sera:grid-cols-1"
            >
              <FieldLabel for="method-bank">
                <Field orientation="horizontal" class="pb-2.5">
                  <RadioGroupItem value="bank" id="method-bank" />
                  <FieldContent>
                    <FieldTitle>Bank Transfer</FieldTitle>
                    <FieldDescription class="text-foreground/80">SWIFT / IBAN</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
              <FieldLabel for="method-paypal">
                <Field orientation="horizontal" class="pb-2.5">
                  <RadioGroupItem value="paypal" id="method-paypal" />
                  <FieldContent>
                    <FieldTitle>PayPal</FieldTitle>
                    <FieldDescription class="line-clamp-1 text-foreground/80">
                      Instant Payout
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            </RadioGroup>
          </FieldSet>
          <Field>
            <FieldLabel for="iban">IBAN / Account Number</FieldLabel>
            <Input id="iban" placeholder="DE89 3704 0044 ...." />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button class="w-full" disabled>
          Save Payout Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
