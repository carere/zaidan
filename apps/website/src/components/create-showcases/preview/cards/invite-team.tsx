import { Copy, Plus } from "lucide-solid";
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
import { Field, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/kobalte/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Separator } from "@/registry/kobalte/ui/separator";

const ROLES = [
  { label: "Admin", value: "admin" },
  { label: "Editor", value: "editor" },
  { label: "Viewer", value: "viewer" },
];

export function InviteTeam() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team</CardTitle>
        <CardDescription>Add members to your workspace</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="flex flex-col gap-3">
          <For
            each={[
              { email: "alex@example.com", role: "Editor" },
              { email: "sam@example.com", role: "Viewer" },
            ]}
          >
            {(invite) => (
              <div class="flex items-center gap-2">
                <Input
                  defaultValue={invite.email}
                  aria-label={`Email for ${invite.role} invite`}
                  class="flex-1"
                />
                <Select
                  options={ROLES}
                  optionValue="value"
                  optionTextValue="label"
                  placeholder={invite.role}
                  defaultValue={ROLES.find((role) => role.value === invite.role.toLowerCase())}
                  itemComponent={(itemProps) => (
                    <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
                  )}
                >
                  <SelectTrigger class="w-24" aria-label={`Role for ${invite.email}`}>
                    <SelectValue<(typeof ROLES)[number]>>
                      {(state) => state.selectedOption().label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>
            )}
          </For>
        </div>
        <Button variant="outline">
          <Plus data-icon="inline-start" />
          Add another
        </Button>
        <Separator />
        <Field>
          <FieldLabel for="invite-link">Or share invite link</FieldLabel>
          <InputGroup>
            <InputGroupInput id="invite-link" defaultValue="https://app.co/invite/x8f2k" readOnly />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Copy link">
                <Copy />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </CardContent>
      <CardFooter>
        <Button class="w-full">Send Invites</Button>
      </CardFooter>
    </Card>
  );
}
