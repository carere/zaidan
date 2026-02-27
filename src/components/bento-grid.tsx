import { Bold, Italic, Underline } from "lucide-solid";
import { type ComponentProps, createSignal, For, onMount } from "solid-js";
import { Zaidan } from "@/components/icons/zaidan";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/registry/kobalte/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/registry/kobalte/ui/alert";
import { Avatar, AvatarFallback } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/kobalte/ui/breadcrumb";
import { Button } from "@/registry/kobalte/ui/button";
import { Calendar } from "@/registry/kobalte/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { Checkbox, CheckboxLabel } from "@/registry/kobalte/ui/checkbox";
import { Input } from "@/registry/kobalte/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/registry/kobalte/ui/input-otp";
import { Kbd } from "@/registry/kobalte/ui/kbd";
import { Label } from "@/registry/kobalte/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/registry/kobalte/ui/pagination";
import { Progress } from "@/registry/kobalte/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/registry/kobalte/ui/radio-group";
import { Separator } from "@/registry/kobalte/ui/separator";
import { Skeleton } from "@/registry/kobalte/ui/skeleton";
import { Slider } from "@/registry/kobalte/ui/slider";
import { Spinner } from "@/registry/kobalte/ui/spinner";
import { Switch } from "@/registry/kobalte/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";
import { Textarea } from "@/registry/kobalte/ui/textarea";
import { Toggle } from "@/registry/kobalte/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/registry/kobalte/ui/toggle-group";

type BentoComponent = {
  slug: string;
  label: string;
  component: () => ComponentProps<"div">["children"];
};

const BENTO_COMPONENTS: BentoComponent[] = [
  {
    slug: "badge",
    label: "Badge",
    component: () => (
      <div class="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
    ),
  },
  {
    slug: "switch",
    label: "Switch",
    component: () => (
      <div class="flex items-center gap-2">
        <Switch id="bento-switch" />
        <Label for="bento-switch">Airplane Mode</Label>
      </div>
    ),
  },
  {
    slug: "slider",
    label: "Slider",
    component: () => <Slider defaultValue={[50]} maxValue={100} step={1} />,
  },
  {
    slug: "progress",
    label: "Progress",
    component: () => <Progress value={60} />,
  },
  {
    slug: "calendar",
    label: "Calendar",
    component: () => <Calendar />,
  },
  {
    slug: "input",
    label: "Input",
    component: () => <Input placeholder="Email" type="email" />,
  },
  {
    slug: "checkbox",
    label: "Checkbox",
    component: () => (
      <div class="flex items-center gap-2">
        <Checkbox defaultChecked>
          <CheckboxLabel>Accept terms</CheckboxLabel>
        </Checkbox>
      </div>
    ),
  },
  {
    slug: "separator",
    label: "Separator",
    component: () => (
      <div class="flex flex-col gap-2">
        <span class="text-sm">Content above</span>
        <Separator />
        <span class="text-sm">Content below</span>
      </div>
    ),
  },
  {
    slug: "skeleton",
    label: "Skeleton",
    component: () => (
      <div class="flex items-center gap-3">
        <Skeleton class="size-10 rounded-full" />
        <div class="flex flex-col gap-2">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="h-3 w-24" />
        </div>
      </div>
    ),
  },
  {
    slug: "spinner",
    label: "Spinner",
    component: () => (
      <div class="flex items-center gap-3">
        <Spinner class="size-5" />
        <span class="text-muted-foreground text-sm">Loading...</span>
      </div>
    ),
  },
  {
    slug: "kbd",
    label: "Kbd",
    component: () => (
      <div class="flex items-center gap-2">
        <Kbd>Ctrl</Kbd>
        <span class="text-muted-foreground text-xs">+</span>
        <Kbd>K</Kbd>
      </div>
    ),
  },
  {
    slug: "textarea",
    label: "Textarea",
    component: () => <Textarea placeholder="Type your message here." />,
  },
  {
    slug: "toggle",
    label: "Toggle",
    component: () => (
      <Toggle aria-label="Toggle bold">
        <Bold class="size-4" />
      </Toggle>
    ),
  },
  {
    slug: "tabs",
    label: "Tabs",
    component: () => (
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
  },
  {
    slug: "avatar",
    label: "Avatar",
    component: () => (
      <div class="flex items-center gap-2">
        <Avatar>
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      </div>
    ),
  },
  {
    slug: "alert",
    label: "Alert",
    component: () => (
      <Alert>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
      </Alert>
    ),
  },
  {
    slug: "card",
    label: "Card",
    component: () => (
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-sm">Card content goes here.</p>
        </CardContent>
      </Card>
    ),
  },
  {
    slug: "radio-group",
    label: "Radio Group",
    component: () => (
      <RadioGroup defaultValue="option-1">
        <div class="flex items-center gap-2">
          <RadioGroupItem value="option-1" />
          <Label>Option 1</Label>
        </div>
        <div class="flex items-center gap-2">
          <RadioGroupItem value="option-2" />
          <Label>Option 2</Label>
        </div>
      </RadioGroup>
    ),
  },
  {
    slug: "pagination",
    label: "Pagination",
    component: () => (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    ),
  },
  {
    slug: "toggle-group",
    label: "Toggle Group",
    component: () => (
      <ToggleGroup multiple>
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <Bold class="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <Italic class="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <Underline class="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    ),
  },
  {
    slug: "accordion",
    label: "Accordion",
    component: () => (
      <Accordion collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Is it accessible?</AccordionTrigger>
          <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
  {
    slug: "breadcrumb",
    label: "Breadcrumb",
    component: () => (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Components</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  },
  {
    slug: "button",
    label: "Button",
    component: () => (
      <div class="flex flex-wrap gap-2">
        <Button size="sm">Default</Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
        <Button size="sm" variant="secondary">
          Secondary
        </Button>
      </div>
    ),
  },
  {
    slug: "input-otp",
    label: "Input OTP",
    component: () => (
      <InputOTP maxLength={4}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    ),
  },
];

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

type GridCell = {
  class: string;
};

const GRID_CELLS: GridCell[] = [
  { class: "col-span-1 row-span-1" },
  { class: "col-span-1 row-span-1" },
  { class: "col-span-1 row-span-2" },
  { class: "col-span-1 row-span-1" },
  // Center card occupies col-span-2 row-span-2 (index 4 is the center)
  { class: "col-span-1 row-span-1" },
  { class: "col-span-1 row-span-1" },
  { class: "col-span-1 row-span-1" },
  { class: "col-span-2 row-span-1" },
  { class: "col-span-1 row-span-1" },
  { class: "col-span-1 row-span-1" },
  { class: "col-span-1 row-span-2" },
  { class: "col-span-1 row-span-1" },
  { class: "col-span-1 row-span-1" },
  { class: "col-span-1 row-span-1" },
];

export function BentoGrid() {
  const [components, setComponents] = createSignal<BentoComponent[]>([]);

  onMount(() => {
    setComponents(shuffle(BENTO_COMPONENTS).slice(0, GRID_CELLS.length));
  });

  return (
    <div class="grid auto-rows-min grid-cols-1 gap-3 p-4 pb-16 md:grid-cols-3 lg:grid-cols-4">
      <For each={components().slice(0, 4)}>
        {(comp, i) => (
          <BentoCard class={GRID_CELLS[i()]?.class ?? ""} label={comp.label}>
            {comp.component()}
          </BentoCard>
        )}
      </For>

      <div class="col-span-1 row-span-2 flex flex-col items-center justify-center gap-6 rounded-lg border bg-background p-8 md:col-span-2 lg:col-span-2">
        <Zaidan class="size-20" />
        <span class="font-bold text-3xl tracking-tight">Zaidan</span>
        <p class="max-w-[280px] text-center text-muted-foreground text-sm">
          Beautifully designed, accessible components for SolidJS.
        </p>
        <div class="flex items-center gap-3">
          <Button as="a" href="/zaidan-agent" target="_parent" size="sm">
            Zaidan Agent
          </Button>
          <Button as="a" href="/installation/solidjs" target="_parent" variant="outline" size="sm">
            Get Started
          </Button>
        </div>
      </div>

      <For each={components().slice(4)}>
        {(comp, i) => (
          <BentoCard class={GRID_CELLS[i() + 4]?.class ?? ""} label={comp.label}>
            {comp.component()}
          </BentoCard>
        )}
      </For>
    </div>
  );
}

function BentoCard(props: {
  class: string;
  label: string;
  children: ComponentProps<"div">["children"];
}) {
  return (
    <div
      class={`relative flex items-center justify-center overflow-hidden rounded-lg border bg-background p-4 ${props.class}`}
    >
      <div class="pointer-events-none w-full">{props.children}</div>
      <span class="absolute bottom-2 left-3 font-medium text-muted-foreground text-xs">
        {props.label}
      </span>
    </div>
  );
}
