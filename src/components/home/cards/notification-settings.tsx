import { For } from "solid-js";
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/registry/kobalte/ui/field";

const notifications = [
  {
    id: "transactions",
    label: "Transaction alerts",
    description: "Deposits, withdrawals, and transfers.",
    defaultChecked: true,
  },
  {
    id: "security",
    label: "Security alerts",
    description: "Login attempts and account changes.",
    defaultChecked: true,
  },
  {
    id: "goals",
    label: "Goal milestones",
    description: "Updates at 25%, 50%, 75%, and 100%.",
    defaultChecked: false,
  },
  {
    id: "market",
    label: "Market updates",
    description: "Daily portfolio summary and price alerts.",
    defaultChecked: false,
  },
];

export function NotificationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose which email and push alerts you want to receive.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <For each={notifications}>
            {(notification) => (
              <Field orientation="horizontal">
                <Checkbox
                  id={`notify-${notification.id}`}
                  defaultChecked={notification.defaultChecked}
                />
                <FieldContent>
                  <FieldLabel for={`notify-${notification.id}`}>{notification.label}</FieldLabel>
                  <FieldDescription>{notification.description}</FieldDescription>
                </FieldContent>
              </Field>
            )}
          </For>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button class="w-full">Save Preferences</Button>
      </CardFooter>
    </Card>
  );
}
