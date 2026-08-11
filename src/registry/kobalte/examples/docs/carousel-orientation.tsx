import { For } from "solid-js";

import { Card, CardContent } from "@/registry/kobalte/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/registry/kobalte/ui/carousel";

export default function CarouselOrientation() {
  return (
    <Carousel
      aria-label="Vertical carousel example"
      opts={{ align: "start" }}
      orientation="vertical"
      class="w-full max-w-xs"
    >
      <CarouselContent class="-mt-1 h-[270px]">
        <For each={Array.from({ length: 5 })}>
          {(_, index) => (
            <CarouselItem class="basis-1/2 pt-1">
              <div class="p-1">
                <Card>
                  <CardContent class="flex items-center justify-center p-6">
                    <span class="text-3xl font-semibold">{index() + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          )}
        </For>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
