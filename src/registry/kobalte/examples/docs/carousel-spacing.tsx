import { For } from "solid-js";

import { Card, CardContent } from "@/registry/kobalte/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/registry/kobalte/ui/carousel";

export default function CarouselSpacing() {
  return (
    <Carousel
      aria-label="Carousel spacing example"
      class="w-full max-w-[12rem] sm:max-w-xs md:max-w-sm"
    >
      <CarouselContent class="-ml-1">
        <For each={Array.from({ length: 5 })}>
          {(_, index) => (
            <CarouselItem class="basis-1/2 pl-1 lg:basis-1/3">
              <div class="p-1">
                <Card>
                  <CardContent class="flex aspect-square items-center justify-center p-6">
                    <span class="text-2xl font-semibold">{index() + 1}</span>
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
