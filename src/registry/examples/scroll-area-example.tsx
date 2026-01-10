import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { ScrollArea, ScrollBar } from "@/registry/ui/scroll-area";
import { Separator } from "@/registry/ui/separator";

export default function ScrollAreaExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1">
      <ScrollAreaDemo />
      <ScrollAreaHorizontalDemo />
      <ScrollAreaBothDirections />
    </ExampleWrapper>
  );
}

const tags = Array.from({ length: 50 }).map((_, i, a) => `v1.2.0-beta.${a.length - i}`);

function ScrollAreaDemo() {
  return (
    <Example title="Vertical Scrolling">
      <ScrollArea class="h-72 w-48 rounded-md border">
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

interface Artwork {
  artist: string;
  art: string;
}

const works: Artwork[] = [
  {
    artist: "Ornella Binni",
    art: "https://images.unsplash.com/photo-1465869185982-5a1a7522cbcb?auto=format&fit=crop&w=300&q=80",
  },
  {
    artist: "Tom Byrom",
    art: "https://images.unsplash.com/photo-1548516173-3cabfa4607e9?auto=format&fit=crop&w=300&q=80",
  },
  {
    artist: "Vladimir Malyavko",
    art: "https://images.unsplash.com/photo-1494337480532-3725c85fd2ab?auto=format&fit=crop&w=300&q=80",
  },
];

function ScrollAreaHorizontalDemo() {
  return (
    <Example title="Horizontal Scrolling">
      <ScrollArea class="w-96 whitespace-nowrap rounded-md border">
        <div class="flex w-max space-x-4 p-4">
          <For each={works}>
            {(artwork) => (
              <figure class="shrink-0">
                <div class="overflow-hidden rounded-md">
                  <img
                    src={artwork.art}
                    alt={`Artwork by ${artwork.artist}`}
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

function ScrollAreaBothDirections() {
  return (
    <Example title="Both Directions">
      <ScrollArea class="h-[200px] w-[350px] rounded-md border p-4">
        <div class="w-[500px]">
          <p class="text-sm">
            Jokester began sneaking into the castle in the middle of the night and leaving jokes all
            over the place: under the king's pillow, in his soup, even in the royal toilet. The king
            was furious, but he couldn't catch the jokester. One day, the king set a trap. He left a
            trail of gold coins leading to the throne room. Sure enough, the jokester followed the
            trail, picked up the coins, and walked right into the trap. But just as the guards were
            about to seize him, the jokester pulled out a smoke bomb and disappeared, leaving behind
            only a note that said, "The joke's on you!" The king couldn't help but laugh, and from
            that day on, he decided to hire the jokester as his court jester. And so, the jokester
            went from being a wanted criminal to being the king's favorite entertainer, proving that
            sometimes, laughter really is the best medicine.
          </p>
        </div>
      </ScrollArea>
    </Example>
  );
}
