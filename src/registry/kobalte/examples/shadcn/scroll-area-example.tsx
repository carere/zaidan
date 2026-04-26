/** biome-ignore-all lint/a11y/noRedundantAlt: <example file> */
import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { ScrollArea, ScrollBar } from "@/registry/kobalte/ui/scroll-area";
import { Separator } from "@/registry/kobalte/ui/separator";

const tags = Array.from({ length: 50 }).map((_, i, a) => `v1.2.0-beta.${a.length - i}`);

const works = [
  {
    artist: "Ornella Binni",
    art: "https://images.unsplash.com/photo-1465869185982-5a1a7522cbcb?auto=format&fit=crop&w=300&q=80",
  },
  {
    artist: "Tom Byrom",
    art: "https://images.unsplash.com/photo-1548516173-3cabfa4607e9?auto=format&fit=crop&w=300&q=80",
  },
  {
    artist: "Vladimir Malyav",
    art: "https://images.unsplash.com/photo-1494337480532-3725c85fd2ab?auto=format&fit=crop&w=300&q=80",
  },
] as const;

export default function ScrollAreaExample() {
  return (
    <ExampleWrapper>
      <ScrollAreaVertical />
      <ScrollAreaHorizontal />
    </ExampleWrapper>
  );
}

function ScrollAreaVertical() {
  return (
    <Example title="Vertical">
      <ScrollArea class="mx-auto h-72 w-48 rounded-md style-luma:rounded-2xl border">
        <div class="p-4">
          <h4 class="mb-4 font-medium text-sm leading-none">Tags</h4>
          <For each={tags}>
            {(tag) => (
              <>
                <div class="text-sm">{tag}</div>
                <Separator class="my-2" />
              </>
            )}
          </For>
        </div>
      </ScrollArea>
    </Example>
  );
}

function ScrollAreaHorizontal() {
  return (
    <Example title="Horizontal">
      <ScrollArea class="mx-auto w-full max-w-96 rounded-md style-luma:rounded-2xl border p-4">
        <div class="flex gap-4">
          <For each={works}>
            {(artwork) => (
              <figure class="shrink-0">
                <div class="overflow-hidden rounded-md">
                  <img
                    src={artwork.art}
                    alt={`Photo by ${artwork.artist}`}
                    class="aspect-[3/4] h-fit w-fit object-cover"
                    width={300}
                    height={400}
                  />
                </div>
                <figcaption class="pt-2 text-muted-foreground text-xs">
                  Photo by <span class="font-semibold text-foreground">{artwork.artist}</span>
                </figcaption>
              </figure>
            )}
          </For>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Example>
  );
}
