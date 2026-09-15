import { CardsDemo } from "@/components/home/cards";

export function HomeShowcase() {
  return (
    <div class="container-wrapper flex-1 p-0">
      <div class="container overflow-hidden md:px-0 lg:max-w-none">
        <section class="-mx-4 w-[140vw] overflow-hidden md:hidden">
          <img
            src="/images/home-showcase-light.png"
            width="1440"
            height="1485"
            alt="Zaidan component showcase"
            class="block h-auto w-full dark:hidden"
          />
          <img
            src="/images/home-showcase-dark.png"
            width="1440"
            height="1485"
            alt="Zaidan component showcase"
            class="hidden h-auto w-full dark:block"
          />
        </section>
        <section class="hidden md:block">
          <CardsDemo />
        </section>
      </div>
    </div>
  );
}
