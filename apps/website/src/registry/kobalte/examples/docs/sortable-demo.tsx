import { GripVertical } from "lucide-solid";
import { createSignal, For } from "solid-js";
import { Sortable, SortableItem, SortableItemHandle } from "@/registry/kobalte/blocks/sortable";
import { Badge } from "@/registry/kobalte/ui/badge";

type Track = {
  id: string;
  title: string;
  artist: string;
  duration: string;
};

const defaultTracks: Track[] = [
  { id: "1", title: "Midnight Drive", artist: "Neon Skyline", duration: "3:42" },
  { id: "2", title: "Paper Planes", artist: "The Cartographers", duration: "4:05" },
  { id: "3", title: "Low Tide", artist: "Harbor Lights", duration: "2:58" },
  { id: "4", title: "Static Bloom", artist: "Velvet Antenna", duration: "3:21" },
  { id: "5", title: "Glass Orchard", artist: "Fern & Field", duration: "4:37" },
];

export default function SortableDemo() {
  const [tracks, setTracks] = createSignal<Track[]>(defaultTracks);

  return (
    <Sortable
      value={tracks()}
      onValueChange={setTracks}
      getItemValue={(track) => track.id}
      class="w-full max-w-md space-y-2"
    >
      <For each={tracks()}>
        {(track, index) => (
          <SortableItem value={track.id}>
            <div class="flex items-center gap-3 rounded-md border bg-background p-3 transition-colors hover:bg-accent/50">
              <SortableItemHandle class="text-muted-foreground hover:text-foreground">
                <GripVertical class="size-4" />
              </SortableItemHandle>
              <Badge variant="secondary" class="w-6 justify-center tabular-nums">
                {index() + 1}
              </Badge>
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-sm">{track.title}</p>
                <p class="truncate text-muted-foreground text-xs">{track.artist}</p>
              </div>
              <span class="text-muted-foreground text-xs tabular-nums">{track.duration}</span>
            </div>
          </SortableItem>
        )}
      </For>
    </Sortable>
  );
}
