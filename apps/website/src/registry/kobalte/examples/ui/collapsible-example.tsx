import { ChevronRightIcon, FileIcon, FolderIcon, MaximizeIcon, MinimizeIcon } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/kobalte/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";

export default function CollapsibleExample() {
  return (
    <ExampleWrapper>
      <CollapsibleFileTree />
      <CollapsibleSettings />
    </ExampleWrapper>
  );
}

type FileTreeItem = { name: string } | { name: string; items: FileTreeItem[] };

const fileTree: FileTreeItem[] = [
  {
    name: "components",
    items: [
      {
        name: "ui",
        items: [
          { name: "button.tsx" },
          { name: "card.tsx" },
          { name: "dialog.tsx" },
          { name: "input.tsx" },
          { name: "select.tsx" },
          { name: "table.tsx" },
        ],
      },
      { name: "login-form.tsx" },
      { name: "register-form.tsx" },
    ],
  },
  {
    name: "lib",
    items: [{ name: "utils.ts" }, { name: "cn.ts" }, { name: "api.ts" }],
  },
  {
    name: "hooks",
    items: [
      { name: "use-media-query.ts" },
      { name: "use-debounce.ts" },
      { name: "use-local-storage.ts" },
    ],
  },
  {
    name: "types",
    items: [{ name: "index.d.ts" }, { name: "api.d.ts" }],
  },
  {
    name: "public",
    items: [{ name: "favicon.ico" }, { name: "logo.svg" }, { name: "images" }],
  },
  { name: "app.tsx" },
  { name: "layout.tsx" },
  { name: "globals.css" },
  { name: "package.json" },
  { name: "tsconfig.json" },
  { name: "README.md" },
  { name: ".gitignore" },
];

function FileTreeItem(props: { item: FileTreeItem }) {
  return (
    <Show
      when={"items" in props.item ? props.item.items : undefined}
      fallback={
        <Button variant="link" size="sm" class="w-full justify-start gap-2 text-foreground">
          <FileIcon />
          <span>{props.item.name}</span>
        </Button>
      }
    >
      {(items) => (
        <Collapsible>
          <CollapsibleTrigger
            as={Button}
            variant="ghost"
            size="sm"
            class="group w-full justify-start transition-none hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronRightIcon class="transition-transform group-data-[expanded]:rotate-90" />
            <FolderIcon />
            {props.item.name}
          </CollapsibleTrigger>
          <CollapsibleContent class="mt-1 ml-5 style-lyra:ml-4">
            <div class="flex flex-col gap-1">
              <For each={items()}>{(item) => <FileTreeItem item={item} />}</For>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Show>
  );
}

function CollapsibleFileTree() {
  return (
    <Example title="File Tree" class="items-center">
      <Card class="mx-auto w-full max-w-[16rem] gap-2" size="sm">
        <CardHeader>
          <Tabs defaultValue="explorer">
            <TabsList class="w-full">
              <TabsTrigger value="explorer">Explorer</TabsTrigger>
              <TabsTrigger value="settings">Outline</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col gap-1">
            <For each={fileTree}>{(item) => <FileTreeItem item={item} />}</For>
          </div>
        </CardContent>
      </Card>
    </Example>
  );
}

function CollapsibleSettings() {
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <Example title="Settings" class="items-center">
      <Card class="mx-auto w-full max-w-xs" size="sm">
        <CardHeader>
          <CardTitle>Radius</CardTitle>
          <CardDescription>Set the corner radius of the element.</CardDescription>
        </CardHeader>
        <CardContent>
          <Collapsible open={isOpen()} onOpenChange={setIsOpen} class="flex items-start gap-2">
            <FieldGroup class="grid w-full grid-cols-2 gap-2">
              <Field>
                <FieldLabel for="collapsible-radius-x" class="sr-only">
                  Radius X
                </FieldLabel>
                <Input id="collapsible-radius-x" placeholder="0" value="0" />
              </Field>
              <Field>
                <FieldLabel for="collapsible-radius-y" class="sr-only">
                  Radius Y
                </FieldLabel>
                <Input id="collapsible-radius-y" placeholder="0" value="0" />
              </Field>
              <CollapsibleContent class="col-span-full grid grid-cols-subgrid gap-2">
                <Field>
                  <FieldLabel for="collapsible-radius-z" class="sr-only">
                    Radius Z
                  </FieldLabel>
                  <Input id="collapsible-radius-z" placeholder="0" value="0" />
                </Field>
                <Field>
                  <FieldLabel for="collapsible-radius-w" class="sr-only">
                    Radius W
                  </FieldLabel>
                  <Input id="collapsible-radius-w" placeholder="0" value="0" />
                </Field>
              </CollapsibleContent>
            </FieldGroup>
            <CollapsibleTrigger
              as={Button}
              variant="outline"
              size="icon"
              aria-label="Toggle radius settings"
            >
              <Show when={isOpen()} fallback={<MaximizeIcon />}>
                <MinimizeIcon />
              </Show>
            </CollapsibleTrigger>
          </Collapsible>
        </CardContent>
      </Card>
    </Example>
  );
}
