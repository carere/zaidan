import { ArrowRight, CircleAlert, LockKeyhole } from "lucide-solid";
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
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/registry/kobalte/ui/item";

export function AccountAccess() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Access</CardTitle>
        <CardDescription>Update your credentials or re-authenticate.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel for="email-address">Email Address</FieldLabel>
            <Input id="email-address" type="email" placeholder="artist@studio.inc" />
          </Field>
          <Field>
            <div class="flex items-center justify-between">
              <FieldLabel for="current-password">Current Password</FieldLabel>
              <button
                type="button"
                class="font-medium text-muted-foreground text-xs uppercase tracking-wider hover:text-foreground"
              >
                Forgot?
              </button>
            </div>
            <Input id="current-password" type="password" placeholder="••••••••••••••••••••••••" />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter class="flex-col gap-4">
        <Button class="w-full">
          <LockKeyhole />
          Update Security
        </Button>
        <Item variant="muted" as="button" type="button">
          <ItemMedia variant="icon">
            <CircleAlert class="text-destructive" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Danger Zone</ItemTitle>
            <ItemDescription class="line-clamp-1">
              Archive account and remove catalog
            </ItemDescription>
          </ItemContent>
          <ArrowRight class="size-4" />
        </Item>
      </CardFooter>
    </Card>
  );
}
