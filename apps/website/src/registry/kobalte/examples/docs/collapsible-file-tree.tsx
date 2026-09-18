import { ChevronRightIcon, FileIcon, FolderIcon } from "lucide-solid";
import { For, Show } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent, CardHeader } from "@/registry/kobalte/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/kobalte/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";

type FileTreeItem = { name: string; items?: FileTreeItem[] };

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
      when={props.item.items}
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
          <CollapsibleContent class="mt-1 ml-5">
            <div class="flex flex-col gap-1">
              <For each={items()}>{(item) => <FileTreeItem item={item} />}</For>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Show>
  );
}

export default function CollapsibleFileTree() {
  return (
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
  );
}
