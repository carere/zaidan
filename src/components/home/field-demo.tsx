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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Textarea } from "@/registry/kobalte/ui/textarea";

const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const years = ["2024", "2025", "2026", "2027", "2028", "2029"];

export default function FieldDemo() {
  return (
    <div class="w-full max-w-md rounded-xl border p-6">
      <form>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Payment Method</FieldLegend>
            <FieldDescription>All transactions are secure and encrypted</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel for="checkout-7j9-card-name-43j">Name on Card</FieldLabel>
                <Input id="checkout-7j9-card-name-43j" placeholder="John Doe" required />
              </Field>
              <div class="grid grid-cols-3 gap-4">
                <Field class="col-span-2">
                  <FieldLabel for="checkout-7j9-card-number-uw1">Card Number</FieldLabel>
                  <Input
                    id="checkout-7j9-card-number-uw1"
                    placeholder="1234 5678 9012 3456"
                    required
                  />
                  <FieldDescription>Enter your 16-digit number.</FieldDescription>
                </Field>
                <Field class="col-span-1">
                  <FieldLabel for="checkout-7j9-cvv">CVV</FieldLabel>
                  <Input id="checkout-7j9-cvv" placeholder="123" required />
                </Field>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel for="checkout-7j9-exp-month-ts6">Month</FieldLabel>
                  <Select
                    options={months}
                    placeholder="MM"
                    itemComponent={(props) => (
                      <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
                    )}
                  >
                    <SelectTrigger id="checkout-7j9-exp-month-ts6">
                      <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                </Field>
                <Field>
                  <FieldLabel for="checkout-7j9-exp-year-f59">Year</FieldLabel>
                  <Select
                    options={years}
                    placeholder="YYYY"
                    itemComponent={(props) => (
                      <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
                    )}
                  >
                    <SelectTrigger id="checkout-7j9-exp-year-f59">
                      <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
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
                <Checkbox id="checkout-7j9-same-as-shipping-wgm" defaultChecked />
                <FieldLabel for="checkout-7j9-same-as-shipping-wgm" class="font-normal">
                  Same as shipping address
                </FieldLabel>
              </Field>
            </FieldGroup>
          </FieldSet>
          <FieldSeparator />
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel for="checkout-7j9-optional-comments">Comments</FieldLabel>
                <Textarea
                  id="checkout-7j9-optional-comments"
                  placeholder="Add any additional comments"
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
