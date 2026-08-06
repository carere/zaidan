import { createEffect, createSignal, For, onCleanup } from "solid-js";

import { Card, CardContent } from "@/registry/kobalte/ui/card";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/registry/kobalte/ui/carousel";

export default function CarouselApiDemo() {
  const [api, setApi] = createSignal<CarouselApi>();
  const [current, setCurrent] = createSignal(0);
  const [count, setCount] = createSignal(0);

  createEffect(() => {
    const carouselApi = api();
    if (!carouselApi) return;

    const onSelect = () => setCurrent(carouselApi.selectedScrollSnap() + 1);

    setCount(carouselApi.scrollSnapList().length);
    onSelect();
    carouselApi.on("select", onSelect);
    onCleanup(() => carouselApi.off("select", onSelect));
  });

  return (
    <div class="mx-auto max-w-[10rem] sm:max-w-xs">
      <Carousel aria-label="Carousel API example" setApi={setApi} class="w-full max-w-xs">
        <CarouselContent>
          <For each={Array.from({ length: 5 })}>
            {(_, index) => (
              <CarouselItem>
                <Card class="m-px">
                  <CardContent class="flex aspect-square items-center justify-center p-6">
                    <span class="text-4xl font-semibold">{index() + 1}</span>
                  </CardContent>
                </Card>
              </CarouselItem>
            )}
          </For>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      <div class="py-2 text-center text-sm text-muted-foreground">
        Slide {current()} of {count()}
      </div>
    </div>
  );
}
