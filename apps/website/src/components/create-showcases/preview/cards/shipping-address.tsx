import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";

const STATES = [
  { label: "California", value: "CA" },
  { label: "New York", value: "NY" },
  { label: "Texas", value: "TX" },
];

const COUNTRIES = [
  { label: "United States", value: "US" },
  { label: "Canada", value: "CA" },
  { label: "United Kingdom", value: "UK" },
];

export function ShippingAddress() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Address</CardTitle>
        <CardDescription>Where should we deliver?</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel for="shipping-street">Street address</FieldLabel>
            <Input id="shipping-street" placeholder="123 Main Street" />
          </Field>
          <Field>
            <FieldLabel for="shipping-apt">Apt / Suite</FieldLabel>
            <Input id="shipping-apt" placeholder="Apt 4B" />
          </Field>
          <FieldGroup class="grid grid-cols-2">
            <Field>
              <FieldLabel for="shipping-city">City</FieldLabel>
              <Input id="shipping-city" placeholder="San Francisco" />
            </Field>
            <Field>
              <FieldLabel for="shipping-state">State</FieldLabel>
              <Select
                options={STATES}
                optionValue="value"
                optionTextValue="label"
                defaultValue={STATES[0]}
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
                )}
              >
                <SelectTrigger id="shipping-state" class="w-full">
                  <SelectValue<(typeof STATES)[number]>>
                    {(state) => state.selectedOption().label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </Field>
          </FieldGroup>
          <FieldGroup class="grid grid-cols-2">
            <Field>
              <FieldLabel for="shipping-zip">ZIP Code</FieldLabel>
              <Input id="shipping-zip" placeholder="94102" />
            </Field>
            <Field>
              <FieldLabel for="shipping-country">Country</FieldLabel>
              <Select
                options={COUNTRIES}
                optionValue="value"
                optionTextValue="label"
                defaultValue={COUNTRIES[0]}
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
                )}
              >
                <SelectTrigger id="shipping-country" class="w-full">
                  <SelectValue<(typeof COUNTRIES)[number]>>
                    {(state) => state.selectedOption().label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </Field>
          </FieldGroup>
          <Field orientation="horizontal">
            <Checkbox id="shipping-save" defaultChecked />
            <FieldLabel for="shipping-save" class="font-normal">
              Save as default address
            </FieldLabel>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          Cancel
        </Button>
        <Button size="sm" class="ml-auto">
          Save Address
        </Button>
      </CardFooter>
    </Card>
  );
}
