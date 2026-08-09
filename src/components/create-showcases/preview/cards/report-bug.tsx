import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Textarea } from "@/registry/kobalte/ui/textarea";

const SEVERITIES = [
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const COMPONENTS = [
  { label: "Dashboard", value: "dashboard" },
  { label: "Auth", value: "auth" },
  { label: "API", value: "api" },
  { label: "Billing", value: "billing" },
];

export function ReportBug() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Bug</CardTitle>
        <CardDescription>Help us fix issues faster.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel for="bug-title">Title</FieldLabel>
            <Input id="bug-title" placeholder="Brief description of the issue" />
          </Field>
          <div class="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel for="bug-severity">Severity</FieldLabel>
              <Select
                options={SEVERITIES}
                optionValue="value"
                optionTextValue="label"
                defaultValue={SEVERITIES[2]}
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
                )}
              >
                <SelectTrigger id="bug-severity" class="w-full">
                  <SelectValue<(typeof SEVERITIES)[number]>>
                    {(state) => state.selectedOption().label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </Field>
            <Field>
              <FieldLabel for="bug-component">Component</FieldLabel>
              <Select
                options={COMPONENTS}
                optionValue="value"
                optionTextValue="label"
                defaultValue={COMPONENTS[0]}
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
                )}
              >
                <SelectTrigger id="bug-component" class="w-full">
                  <SelectValue<(typeof COMPONENTS)[number]>>
                    {(state) => state.selectedOption().label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel for="bug-steps">Steps to reproduce</FieldLabel>
            <Textarea
              id="bug-steps"
              placeholder="1. Go to&#10;2. Click on&#10;3. Observe..."
              class="min-h-24 resize-none"
            />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal" class="justify-end style-sera:justify-center">
          <Button variant="outline" class="style-sera:flex-1">
            Attach File
          </Button>
          <Button class="style-sera:flex-1">Submit Bug</Button>
        </Field>
      </CardFooter>
    </Card>
  );
}
