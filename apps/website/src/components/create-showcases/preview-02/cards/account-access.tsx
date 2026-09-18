import { AlertCircle, ArrowRight, LockKeyhole } from "lucide-solid";
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
            <Input id="email-address" type="email" defaultValue="artist@studio.inc" />
          </Field>
          <Field>
            <div class="flex items-center justify-between">
              <FieldLabel for="current-password">Current Password</FieldLabel>
              <a
                href="/"
                class="text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground"
              >
                Forgot?
              </a>
            </div>
            <Input id="current-password" type="password" defaultValue="password123" />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter class="flex-col gap-4">
        <Button class="w-full">
          <LockKeyhole />
          Update Security
        </Button>
        <Item as="a" href="/" variant="muted">
          <ItemMedia variant="icon">
            <AlertCircle class="text-destructive" />
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
