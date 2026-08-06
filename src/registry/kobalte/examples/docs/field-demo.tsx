import { For } from "solid-js";

import { Button } from "@/registry/kobalte/ui/button";
import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Textarea } from "@/registry/kobalte/ui/textarea";

const months = [
  { label: "01", value: "01" },
  { label: "02", value: "02" },
  { label: "03", value: "03" },
  { label: "04", value: "04" },
  { label: "05", value: "05" },
  { label: "06", value: "06" },
  { label: "07", value: "07" },
  { label: "08", value: "08" },
  { label: "09", value: "09" },
  { label: "10", value: "10" },
  { label: "11", value: "11" },
  { label: "12", value: "12" },
];

const years = [
  { label: "2024", value: "2024" },
  { label: "2025", value: "2025" },
  { label: "2026", value: "2026" },
  { label: "2027", value: "2027" },
  { label: "2028", value: "2028" },
  { label: "2029", value: "2029" },
];

export default function FieldDemo() {
  return (
    <div class="w-full max-w-md">
      <form>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Payment Method</FieldLegend>
            <FieldDescription>All transactions are secure and encrypted</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel for="checkout-card-name">Name on Card</FieldLabel>
                <Input id="checkout-card-name" placeholder="Evil Rabbit" required />
              </Field>
              <Field>
                <FieldLabel for="checkout-card-number">Card Number</FieldLabel>
                <Input id="checkout-card-number" placeholder="1234 5678 9012 3456" required />
                <FieldDescription>Enter your 16-digit card number</FieldDescription>
              </Field>
              <div class="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel for="checkout-exp-month">Month</FieldLabel>
                  <Select<string> items={months}>
                    <SelectTrigger id="checkout-exp-month">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <For each={months}>
                          {(item) => <SelectItem value={item.value}>{item.label}</SelectItem>}
                        </For>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel for="checkout-exp-year">Year</FieldLabel>
                  <Select<string> items={years}>
                    <SelectTrigger id="checkout-exp-year">
                      <SelectValue placeholder="YYYY" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <For each={years}>
                          {(item) => <SelectItem value={item.value}>{item.label}</SelectItem>}
                        </For>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel for="checkout-cvv">CVV</FieldLabel>
                  <Input id="checkout-cvv" placeholder="123" required />
                </Field>
              </div>
            </FieldGroup>
          </FieldSet>
          <FieldSeparator />
          <FieldSet>
            <FieldLegend>Billing Address</FieldLegend>
            <FieldDescription>
              The billing address associated with your payment method
            </FieldDescription>
            <FieldGroup>
              <Field orientation="horizontal">
                <Checkbox id="checkout-same-as-shipping" defaultChecked />
                <FieldLabel for="checkout-same-as-shipping" class="font-normal">
                  Same as shipping address
                </FieldLabel>
              </Field>
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel for="checkout-comments">Comments</FieldLabel>
                <Textarea
                  id="checkout-comments"
                  placeholder="Add any additional comments"
                  class="resize-none"
                />
              </Field>
            </FieldGroup>
          </FieldSet>
          <Field orientation="horizontal">
            <Button type="submit">Submit</Button>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
