/** biome-ignore-all lint/a11y/useValidAnchor: <example file> */
import { Captions, Plus } from "lucide-solid";
import { createSignal, For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/registry/kobalte/ui/avatar";
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
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/registry/kobalte/ui/toggle-group";

const spacingOptions = [
  {
    class: "[--card-spacing:--spacing(4)]",
    label: "16px",
    value: "4",
  },
  {
    class: "[--card-spacing:--spacing(5)]",
    label: "20px",
    value: "5",
  },
  {
    class: "[--card-spacing:--spacing(6)]",
    label: "24px",
    value: "6",
  },
  {
    class: "[--card-spacing:--spacing(8)]",
    label: "32px",
    value: "8",
  },
];

export default function CardExample() {
  return (
    <ExampleWrapper>
      <CardDefault />
      <CardSmall />
      <CardContentEdgeToEdge />
      <CardCustomSpacing />
      <CardHeaderWithBorder />
      <CardFooterWithBorder />
      <CardHeaderWithBorderSmall />
      <CardFooterWithBorderSmall />
      <CardWithImage />
      <CardWithImageSmall />
      <CardLogin />
      <CardMeetingNotes />
    </ExampleWrapper>
  );
}

function CardContentEdgeToEdge() {
  return (
    <Example title="Content Edge to Edge">
      <Card class="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Terms of Service</CardTitle>
          <CardDescription>Review the terms before accepting the agreement.</CardDescription>
        </CardHeader>
        <CardContent class="-mb-(--card-spacing) px-0">
          <div class="max-h-48 space-y-4 overflow-y-scroll border-t bg-muted/50 px-(--card-spacing) py-4 text-sm leading-relaxed">
            <p>
              These terms govern your use of the workspace, including access to shared documents,
              project files, and collaboration tools.
            </p>
            <p>
              You are responsible for the content you upload and for ensuring that your team has the
              appropriate permissions to view or edit it.
            </p>
            <p>
              We may update features or limits as the service evolves. When those changes materially
              affect your workflow, we will notify your workspace administrators.
            </p>
            <p>
              By continuing, you agree to keep your account credentials secure and to follow your
              organization&apos;s acceptable use policies.
            </p>
          </div>
        </CardContent>
        <CardFooter class="justify-end gap-2">
          <Button variant="outline">Decline</Button>
          <Button>Accept</Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardCustomSpacing() {
  const [spacing, setSpacing] = createSignal("4");
  const selectedSpacing = () => spacingOptions.find((option) => option.value === spacing());

  return (
    <Example title="Custom Spacing">
      <div class="mx-auto grid w-full max-w-sm gap-4">
        <ToggleGroup
          value={spacing()}
          onChange={(value) => {
            if (value) setSpacing(value);
          }}
          variant="outline"
          size="sm"
          class="justify-center"
        >
          <For each={spacingOptions}>
            {(option) => <ToggleGroupItem value={option.value}>{option.label}</ToggleGroupItem>}
          </For>
        </ToggleGroup>
        <Card class={selectedSpacing()?.class}>
          <CardHeader>
            <CardTitle>Release Health</CardTitle>
            <CardDescription>Track readiness across launch signals.</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid gap-2 rounded-lg bg-muted/50 p-3 text-sm style-lyra:rounded-none style-sera:rounded-none">
              <div class="flex items-center justify-between gap-2">
                <span class="text-muted-foreground">Checks passed</span>
                <span class="font-medium">24 / 26</span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-muted-foreground">Open blockers</span>
                <span class="font-medium">2</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Example>
  );
}

function CardDefault() {
  return (
    <Example title="Default Size">
      <Card size="default" class="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Default Card</CardTitle>
          <CardDescription>This card uses the default size variant.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            The card component supports a size prop that defaults to "default" for standard spacing
            and sizing.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" class="w-full">
            Action
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardSmall() {
  return (
    <Example title="Small Size">
      <Card size="sm" class="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Small Card</CardTitle>
          <CardDescription>This card uses the small size variant.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            The card component supports a size prop that can be set to "sm" for a more compact
            appearance.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" class="w-full">
            Action
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardHeaderWithBorder() {
  return (
    <Example title="Header with Border">
      <Card class="mx-auto w-full max-w-sm">
        <CardHeader class="border-b">
          <CardTitle>Header with Border</CardTitle>
          <CardDescription>This is a card with a header that has a bottom border.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            The header has a border-b class applied, creating a visual separation between the header
            and content sections.
          </p>
        </CardContent>
      </Card>
    </Example>
  );
}

function CardFooterWithBorder() {
  return (
    <Example title="Footer with Border">
      <Card class="mx-auto w-full max-w-sm">
        <CardContent>
          <p>
            The footer has a border-t class applied, creating a visual separation between the
            content and footer sections.
          </p>
        </CardContent>
        <CardFooter class="border-t">
          <Button variant="outline" class="w-full">
            Footer with Border
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardHeaderWithBorderSmall() {
  return (
    <Example title="Header with Border (Small)">
      <Card size="sm" class="mx-auto w-full max-w-sm">
        <CardHeader class="border-b">
          <CardTitle>Header with Border</CardTitle>
          <CardDescription>
            This is a small card with a header that has a bottom border.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            The header has a border-b class applied, creating a visual separation between the header
            and content sections.
          </p>
        </CardContent>
      </Card>
    </Example>
  );
}

function CardFooterWithBorderSmall() {
  return (
    <Example title="Footer with Border (Small)">
      <Card size="sm" class="mx-auto w-full max-w-sm">
        <CardContent>
          <p>
            The footer has a border-t class applied, creating a visual separation between the
            content and footer sections.
          </p>
        </CardContent>
        <CardFooter class="border-t">
          <Button variant="outline" size="sm" class="w-full">
            Footer with Border
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardWithImage() {
  return (
    <Example title="With Image">
      <Card size="default" class="relative mx-auto w-full max-w-sm pt-0">
        <div class="absolute inset-0 z-30 aspect-video bg-primary opacity-50 mix-blend-color" />
        <img
          src="https://images.unsplash.com/photo-1604076850742-4c7221f3101b?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Landscape by mymind on Unsplash"
          title="Landscape by mymind on Unsplash"
          class="relative z-20 aspect-video w-full object-cover brightness-60 grayscale"
        />
        <CardHeader>
          <CardTitle>Beautiful Landscape</CardTitle>
          <CardDescription>
            A stunning view that captures the essence of natural beauty.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button class="w-full">
            <Plus data-icon="inline-start" />
            Button
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardWithImageSmall() {
  return (
    <Example title="With Image (Small)">
      <Card size="sm" class="relative mx-auto w-full max-w-sm pt-0">
        <div class="absolute inset-0 z-30 aspect-video bg-primary opacity-50 mix-blend-color" />
        <img
          src="https://images.unsplash.com/photo-1604076850742-4c7221f3101b?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Landscape by mymind on Unsplash"
          title="Landscape by mymind on Unsplash"
          class="relative z-20 aspect-video w-full object-cover brightness-60 grayscale"
        />
        <CardHeader>
          <CardTitle>Beautiful Landscape</CardTitle>
          <CardDescription>
            A stunning view that captures the essence of natural beauty.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button size="sm" class="w-full">
            <Plus data-icon="inline-start" />
            Button
          </Button>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardLogin() {
  return (
    <Example title="Login">
      <Card class="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel for="email">Email</FieldLabel>
                <Input id="email" type="email" placeholder="m@example.com" required />
              </Field>
              <Field>
                <div class="flex items-center">
                  <FieldLabel for="password">Password</FieldLabel>
                  <a href="#" class="ml-auto inline-block underline-offset-4 hover:underline">
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" required />
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter class="flex-col gap-2">
          <Button type="submit" class="w-full">
            Login
          </Button>
          <Button variant="outline" class="w-full">
            Login with Google
          </Button>
          <div class="mt-4 text-center">
            Don&apos;t have an account?{" "}
            <a href="#" class="underline underline-offset-4">
              Sign up
            </a>
          </div>
        </CardFooter>
      </Card>
    </Example>
  );
}

function CardMeetingNotes() {
  return (
    <Example title="Meeting Notes">
      <Card class="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Meeting Notes</CardTitle>
          <CardDescription>Transcript from the meeting with the client.</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm">
              <Captions data-icon="inline-start" />
              Transcribe
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p>Client requested dashboard redesign with focus on mobile responsiveness.</p>
          <ol class="mt-4 flex list-decimal flex-col gap-2 pl-6">
            <li>New analytics widgets for daily/weekly metrics</li>
            <li>Simplified navigation menu</li>
            <li>Dark mode support</li>
            <li>Timeline: 6 weeks</li>
            <li>Follow-up meeting scheduled for next Tuesday</li>
          </ol>
        </CardContent>
        <CardFooter>
          <AvatarGroup>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage src="https://github.com/maxleiter.png" alt="@maxleiter" />
              <AvatarFallback>LR</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage src="https://github.com/evilrabbit.png" alt="@evilrabbit" />
              <AvatarFallback>ER</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+8</AvatarGroupCount>
          </AvatarGroup>
        </CardFooter>
      </Card>
    </Example>
  );
}
