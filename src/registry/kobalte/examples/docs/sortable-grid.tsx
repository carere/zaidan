import { GripVertical } from "lucide-solid";
import { createSignal, For } from "solid-js";
import { Sortable, SortableItem, SortableItemHandle } from "@/registry/kobalte/blocks/sortable";
import { Badge } from "@/registry/kobalte/ui/badge";

type Asset = {
  id: string;
  title: string;
  kind: "image" | "video" | "audio" | "document";
};

const defaultAssets: Asset[] = [
  { id: "1", title: "Hero Image", kind: "image" },
  { id: "2", title: "Demo Video", kind: "video" },
  { id: "3", title: "Voice Over", kind: "audio" },
  { id: "4", title: "Spec Sheet", kind: "document" },
  { id: "5", title: "Gallery 1", kind: "image" },
  { id: "6", title: "Gallery 2", kind: "image" },
  { id: "7", title: "User Manual", kind: "document" },
  { id: "8", title: "Teaser Clip", kind: "video" },
  { id: "9", title: "Soundtrack", kind: "audio" },
];

const kindVariant: Record<Asset["kind"], "default" | "secondary" | "outline" | "destructive"> = {
  image: "default",
  video: "outline",
  audio: "destructive",
  document: "secondary",
};

export default function SortableGrid() {
  const [assets, setAssets] = createSignal<Asset[]>(defaultAssets);

  return (
    <Sortable
      value={assets()}
      onValueChange={setAssets}
      getItemValue={(asset) => asset.id}
      class="grid w-full max-w-lg grid-cols-3 gap-3"
    >
      <For each={assets()}>
        {(asset) => (
          <SortableItem value={asset.id}>
            <div class="group relative flex min-h-24 flex-col justify-between rounded-md border bg-background p-3 transition-colors hover:bg-accent/50">
              <SortableItemHandle class="absolute inset-e-1.5 top-2.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
                <GripVertical class="size-3.5" />
              </SortableItemHandle>
              <p class="truncate pe-5 font-medium text-sm">{asset.title}</p>
              <Badge variant={kindVariant[asset.kind]} class="w-fit">
                {asset.kind}
              </Badge>
            </div>
          </SortableItem>
        )}
      </For>
    </Sortable>
  );
}
