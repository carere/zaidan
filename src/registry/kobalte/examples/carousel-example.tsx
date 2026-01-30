import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Card, CardContent } from "@/registry/kobalte/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/registry/kobalte/ui/carousel";

export default function CarouselExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1">
      <CarouselBasic />
      <CarouselMultiple />
      <CarouselWithGap />
    </ExampleWrapper>
  );
}

function CarouselBasic() {
  return (
    <Example title="Basic">
      <Carousel class="mx-auto max-w-xs sm:max-w-sm">
        <CarouselContent>
          <For each={Array.from({ length: 5 })}>
            {(_, index) => (
              <CarouselItem>
                <div class="p-1">
                  <Card>
                    <CardContent class="flex aspect-square items-center justify-center p-6">
                      <span class="font-semibold text-4xl">{index() + 1}</span>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            )}
          </For>
        </CarouselContent>
        <CarouselPrevious class="hidden sm:inline-flex" />
        <CarouselNext class="hidden sm:inline-flex" />
      </Carousel>
    </Example>
  );
}

function CarouselMultiple() {
  return (
    <Example title="Multiple">
      <Carousel
        class="mx-auto max-w-xs sm:max-w-sm"
        opts={{
          align: "start",
        }}
      >
        <CarouselContent>
          <For each={Array.from({ length: 5 })}>
            {(_, index) => (
              <CarouselItem class="sm:basis-1/2 lg:basis-1/3">
                <div class="p-1">
                  <Card>
                    <CardContent class="flex aspect-square items-center justify-center p-6">
                      <span class="font-semibold text-3xl">{index() + 1}</span>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            )}
          </For>
        </CarouselContent>
        <CarouselPrevious class="hidden sm:inline-flex" />
        <CarouselNext class="hidden sm:inline-flex" />
      </Carousel>
    </Example>
  );
}

function CarouselWithGap() {
  return (
    <Example title="With Gap">
      <Carousel class="mx-auto max-w-xs sm:max-w-sm">
        <CarouselContent class="-ml-1">
          <For each={Array.from({ length: 5 })}>
            {(_, index) => (
              <CarouselItem class="pl-1 md:basis-1/2">
                <div class="p-1">
                  <Card>
                    <CardContent class="flex aspect-square items-center justify-center p-6">
                      <span class="font-semibold text-2xl">{index() + 1}</span>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            )}
          </For>
        </CarouselContent>
        <CarouselPrevious class="hidden sm:inline-flex" />
        <CarouselNext class="hidden sm:inline-flex" />
      </Carousel>
    </Example>
  );
}
