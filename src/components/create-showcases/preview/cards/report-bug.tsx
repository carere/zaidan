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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Textarea } from "@/registry/kobalte/ui/textarea";

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
                items={[
                  { label: "Critical", value: "critical" },
                  { label: "High", value: "high" },
                  { label: "Medium", value: "medium" },
                  { label: "Low", value: "low" },
                ]}
                defaultValue="medium"
              >
                <SelectTrigger id="bug-severity" class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel for="bug-component">Component</FieldLabel>
              <Select
                items={[
                  { label: "Dashboard", value: "dashboard" },
                  { label: "Auth", value: "auth" },
                  { label: "API", value: "api" },
                  { label: "Billing", value: "billing" },
                ]}
                defaultValue="dashboard"
              >
                <SelectTrigger id="bug-component" class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                  </SelectGroup>
                </SelectContent>
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
