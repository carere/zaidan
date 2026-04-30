import { FileText, GripVertical, Image as ImageIcon, Music, Video } from "lucide-solid";
import { createSignal, For } from "solid-js";
import { toast } from "solid-sonner";
import { Example, ExampleWrapper } from "@/components/example";
import { Sortable, SortableItem, SortableItemHandle } from "@/registry/kobalte/blocks/sortable";
import { Badge } from "@/registry/kobalte/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { Toaster } from "@/registry/kobalte/ui/sonner";
import { Switch } from "@/registry/kobalte/ui/switch";

export default function SortableExample() {
  return (
    <>
      <Toaster />
      <ExampleWrapper class="lg:grid-cols-1 2xl:grid-cols-1">
        <SortableBasic />
        <SortableGrid />
        <SortableNested />
        <SortableWithSwitch />
      </ExampleWrapper>
    </>
  );
}

type FileItem = {
  id: string;
  title: string;
  description: string;
  type: "image" | "document" | "audio" | "video";
  size: string;
};

const defaultFileItems: FileItem[] = [
  {
    id: "1",
    title: "Product Demo",
    description: "Main product image",
    type: "image",
    size: "2.4 MB",
  },
  {
    id: "2",
    title: "Product Specification",
    description: "Technical details document",
    type: "document",
    size: "1.2 MB",
  },
  {
    id: "3",
    title: "Product Demo Video",
    description: "How to use the product",
    type: "video",
    size: "15.7 MB",
  },
  {
    id: "4",
    title: "Product Audio Guide",
    description: "Audio instructions",
    type: "audio",
    size: "8.3 MB",
  },
  {
    id: "5",
    title: "Product Specification",
    description: "Additional product view",
    type: "image",
    size: "3.1 MB",
  },
];

function getTypeIcon(type: FileItem["type"]) {
  switch (type) {
    case "image":
      return <ImageIcon class="h-4 w-4" />;
    case "document":
      return <FileText class="h-4 w-4" />;
    case "audio":
      return <Music class="h-4 w-4" />;
    case "video":
      return <Video class="h-4 w-4" />;
  }
}

function getTypeVariant(
  type: FileItem["type"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (type) {
    case "image":
      return "default";
    case "document":
      return "secondary";
    case "audio":
      return "destructive";
    case "video":
      return "outline";
  }
}

function SortableBasic() {
  const [items, setItems] = createSignal<FileItem[]>(defaultFileItems);

  const handleValueChange = (newItems: FileItem[]) => {
    setItems(newItems);
    toast.success("Items reordered successfully!", {
      description: newItems.map((item, index) => `${index + 1}. ${item.title}`).join(", "),
    });
  };

  return (
    <Example title="Basic">
      <Sortable
        value={items()}
        onValueChange={handleValueChange}
        getItemValue={(item) => item.id}
        class="mx-auto w-full max-w-xl space-y-2"
      >
        <For each={items()}>
          {(item) => (
            <SortableItem value={item.id}>
              <div class="flex items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-accent/50">
                <SortableItemHandle class="text-muted-foreground hover:text-foreground">
                  <GripVertical class="h-4 w-4" />
                </SortableItemHandle>

                <div class="flex items-center gap-2 text-muted-foreground">
                  {getTypeIcon(item.type)}
                </div>

                <div class="min-w-0 flex-1">
                  <h4 class="truncate font-medium text-sm">{item.title}</h4>
                  <p class="truncate text-muted-foreground text-xs">{item.description}</p>
                </div>

                <div class="flex items-center gap-2">
                  <Badge variant={getTypeVariant(item.type)}>{item.type}</Badge>
                  <span class="text-muted-foreground text-xs">{item.size}</span>
                </div>
              </div>
            </SortableItem>
          )}
        </For>
      </Sortable>
    </Example>
  );
}

type GridItem = {
  id: string;
  title: string;
  description: string;
  type: "image" | "document" | "audio" | "video" | "featured";
  size: string;
};

const defaultGridItems: GridItem[] = [
  {
    id: "1",
    title: "Hero Image",
    description: "Main banner image",
    type: "image",
    size: "2.4 MB",
  },
  {
    id: "2",
    title: "Product Specs",
    description: "Technical documentation",
    type: "document",
    size: "1.2 MB",
  },
  {
    id: "3",
    title: "Demo Video",
    description: "Product demonstration",
    type: "video",
    size: "15.7 MB",
  },
  {
    id: "4",
    title: "Audio Guide",
    description: "Voice instructions",
    type: "audio",
    size: "8.3 MB",
  },
  {
    id: "5",
    title: "Gallery Photo",
    description: "Product view",
    type: "image",
    size: "3.1 MB",
  },
  {
    id: "6",
    title: "User Manual",
    description: "Installation guide",
    type: "document",
    size: "4.2 MB",
  },
];

function getGridVariant(
  type: GridItem["type"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (type) {
    case "image":
      return "default";
    case "document":
      return "secondary";
    case "audio":
      return "destructive";
    case "video":
      return "outline";
    case "featured":
      return "default";
  }
}

function SortableGrid() {
  const [items, setItems] = createSignal<GridItem[]>(defaultGridItems);

  const handleValueChange = (newItems: GridItem[]) => {
    setItems(newItems);
    toast.success("Grid items reordered successfully!", {
      description: `New order: ${newItems
        .map((item, index) => `${index + 1}. ${item.title}`)
        .join(", ")}`,
    });
  };

  return (
    <Example title="Grid">
      <Sortable
        value={items()}
        onValueChange={handleValueChange}
        getItemValue={(item) => item.id}
        class="mx-auto grid w-full max-w-2xl auto-rows-fr grid-cols-3 gap-3"
      >
        <For each={items()}>
          {(item) => (
            <SortableItem value={item.id}>
              <div class="group relative flex min-h-[100px] flex-col rounded-md border border-border bg-background p-3 transition-colors hover:bg-accent/50">
                <SortableItemHandle class="absolute end-1.5 top-2.5 z-10 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
                  <GripVertical class="h-3.5 w-3.5" />
                </SortableItemHandle>

                <div class="min-w-0 flex-1">
                  <h4 class="truncate font-medium text-sm">{item.title}</h4>
                  <p class="mt-0.5 truncate text-muted-foreground text-xs">{item.description}</p>
                </div>

                <div class="mt-2 flex items-center justify-between">
                  <Badge variant={getGridVariant(item.type)}>{item.type}</Badge>
                  <span class="text-muted-foreground text-xs">{item.size}</span>
                </div>
              </div>
            </SortableItem>
          )}
        </For>
      </Sortable>
    </Example>
  );
}

type OptionValue = {
  id: string;
  value: string;
};

type OptionGroup = {
  id: string;
  name: string;
  values: OptionValue[];
};

const defaultOptionGroups: OptionGroup[] = [
  {
    id: "1",
    name: "Colors",
    values: [
      { id: "1-1", value: "White" },
      { id: "1-2", value: "Black" },
      { id: "1-3", value: "Grey" },
      { id: "1-4", value: "Green" },
    ],
  },
  {
    id: "2",
    name: "Sizes",
    values: [
      { id: "2-1", value: "Small" },
      { id: "2-2", value: "Medium" },
      { id: "2-3", value: "Large" },
    ],
  },
  {
    id: "3",
    name: "Materials",
    values: [
      { id: "3-1", value: "Cotton" },
      { id: "3-2", value: "Polyester" },
      { id: "3-3", value: "Wool" },
    ],
  },
];

function SortableNested() {
  const [optionGroups, setOptionGroups] = createSignal<OptionGroup[]>(defaultOptionGroups);

  const handleParentReorder = (newGroups: OptionGroup[]) => {
    setOptionGroups(newGroups);
    toast.success("Option groups reordered successfully!", {
      description: newGroups.map((group, index) => `${index + 1}. ${group.name}`).join(", "),
    });
  };

  const handleChildReorder = (groupId: string, newValues: OptionValue[]) => {
    setOptionGroups((prev) =>
      prev.map((group) => (group.id === groupId ? { ...group, values: newValues } : group)),
    );
    toast.success("Values reordered successfully!", {
      description: newValues.map((value, index) => `${index + 1}. ${value.value}`).join(", "),
    });
  };

  return (
    <Example title="Nested">
      <Sortable
        value={optionGroups()}
        onValueChange={handleParentReorder}
        getItemValue={(group) => group.id}
        class="mx-auto w-full max-w-sm space-y-4"
      >
        <For each={optionGroups()}>
          {(group) => (
            <SortableItem value={group.id}>
              <Card class="p-2">
                <CardContent class="p-0">
                  <div class="mb-2 flex items-center gap-2">
                    <SortableItemHandle class="text-muted-foreground hover:text-foreground">
                      <GripVertical class="h-4 w-4" />
                    </SortableItemHandle>
                    <h3 class="font-semibold text-sm">{group.name}</h3>
                  </div>

                  <Sortable
                    value={group.values}
                    onValueChange={(newValues) => handleChildReorder(group.id, newValues)}
                    getItemValue={(value) => value.id}
                    class="space-y-2"
                  >
                    <For each={group.values}>
                      {(value) => (
                        <SortableItem value={value.id}>
                          <div class="flex items-center gap-2 rounded-md border border-border p-1.5">
                            <SortableItemHandle class="text-muted-foreground hover:text-foreground">
                              <GripVertical class="h-4 w-4" />
                            </SortableItemHandle>
                            <span class="flex-1 text-sm">{value.value}</span>
                          </div>
                        </SortableItem>
                      )}
                    </For>
                  </Sortable>
                </CardContent>
              </Card>
            </SortableItem>
          )}
        </For>
      </Sortable>
    </Example>
  );
}

type NotificationChannel = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

const defaultChannels: NotificationChannel[] = [
  {
    id: "1",
    name: "Email",
    description: "Send notifications via email",
    enabled: true,
  },
  {
    id: "2",
    name: "Push Notifications",
    description: "Browser and mobile push",
    enabled: true,
  },
  {
    id: "3",
    name: "SMS",
    description: "Text message alerts",
    enabled: false,
  },
  {
    id: "4",
    name: "Slack",
    description: "Post to Slack channels",
    enabled: true,
  },
  {
    id: "5",
    name: "Webhook",
    description: "Send to custom endpoint",
    enabled: false,
  },
];

function SortableWithSwitch() {
  const [channels, setChannels] = createSignal<NotificationChannel[]>(defaultChannels);

  const toggleChannel = (id: string) => {
    setChannels((prev) => prev.map((ch) => (ch.id === id ? { ...ch, enabled: !ch.enabled } : ch)));
  };

  return (
    <Example title="Settings Priority">
      <Card class="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Notification Priority</CardTitle>
          <CardDescription>
            Drag to reorder by priority. Top channels are tried first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Sortable
            value={channels()}
            onValueChange={setChannels}
            getItemValue={(item) => item.id}
            class="space-y-1"
          >
            <For each={channels()}>
              {(channel) => (
                <SortableItem value={channel.id}>
                  <div class="flex items-center gap-3 rounded-md border px-3 py-2.5">
                    <SortableItemHandle class="text-muted-foreground hover:text-foreground">
                      <GripVertical class="size-4" />
                    </SortableItemHandle>
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-sm">{channel.name}</p>
                      <p class="text-muted-foreground text-xs">{channel.description}</p>
                    </div>
                    <Switch checked={channel.enabled} onChange={() => toggleChannel(channel.id)} />
                  </div>
                </SortableItem>
              )}
            </For>
          </Sortable>
        </CardContent>
      </Card>
    </Example>
  );
}
