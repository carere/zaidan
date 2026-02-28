import { Home, PhoneCall, Settings, User } from "lucide-solid";
import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { AnimatedBackground } from "@/registry/kobalte/ui/animated-background";

export default function AnimatedBackgroundExample() {
  return (
    <ExampleWrapper class="w-full max-w-4xl lg:grid-cols-1 2xl:max-w-4xl 2xl:grid-cols-1">
      <AnimatedTabs />
      <AnimatedTabsHover />
      <AnimatedCardBackgroundHover />
      <SegmentedControl />
    </ExampleWrapper>
  );
}

function AnimatedTabs() {
  const TABS = [
    {
      label: "Home",
      icon: <Home class="h-5 w-5" />,
    },
    {
      label: "About",
      icon: <User class="h-5 w-5" />,
    },
    {
      label: "Services",
      icon: <Settings class="h-5 w-5" />,
    },
    {
      label: "Contact",
      icon: <PhoneCall class="h-5 w-5" />,
    },
  ];

  return (
    <Example title="Animated Tabs">
      <div class="flex w-full space-x-2 rounded-xl border border-zinc-950/10 bg-white p-2 dark:border-zinc-50/10 dark:bg-zinc-900">
        <AnimatedBackground
          defaultValue={TABS[0].label}
          class="rounded-lg bg-zinc-100 dark:bg-zinc-800"
          transition={{
            duration: 0.3,
            easing: "ease",
          }}
        >
          <For each={TABS}>
            {(tab) => (
              <button
                data-id={tab.label}
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center text-zinc-500 transition-colors duration-100 focus-visible:outline-2 data-[checked=true]:text-zinc-950 dark:text-zinc-400 dark:data-[checked=true]:text-zinc-50"
              >
                {tab.icon}
              </button>
            )}
          </For>
        </AnimatedBackground>
      </div>
    </Example>
  );
}

function AnimatedTabsHover() {
  const TABS = ["Home", "About", "Services", "Contact"];

  return (
    <Example title="Animated Tabs Hover">
      <div class="flex flex-row">
        <AnimatedBackground
          defaultValue={TABS[0]}
          class="rounded-lg bg-zinc-100 dark:bg-zinc-800"
          transition={{
            duration: 0.3,
            easing: "ease",
          }}
          enableHover
        >
          <For each={TABS}>
            {(tab) => (
              <button
                data-id={tab}
                type="button"
                class="px-2 py-0.5 text-zinc-600 transition-colors duration-300 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {tab}
              </button>
            )}
          </For>
        </AnimatedBackground>
      </div>
    </Example>
  );
}

function AnimatedCardBackgroundHover() {
  const ITEMS = [
    {
      id: 1,
      title: "Dialog",
      description: "Enhances modal presentations.",
    },
    {
      id: 2,
      title: "Popover",
      description: "For small interactive overlays.",
    },
    {
      id: 3,
      title: "Accordion",
      description: "Collapsible sections for more content.",
    },
    {
      id: 4,
      title: "Collapsible",
      description: "Collapsible sections for more content.",
    },
    {
      id: 5,
      title: "Drag to Reorder",
      description: "Reorder items with drag and drop.",
    },
    {
      id: 6,
      title: "Swipe to Delete",
      description: "Delete items with swipe gestures.",
    },
  ];

  return (
    <Example title="Animated Card Background">
      <div class="p-10">
        <AnimatedBackground
          containerClass="grid grid-cols-2 md:grid-cols-3"
          class="rounded-lg bg-zinc-100 dark:bg-zinc-800"
          transition={{
            duration: 0.6,
            easing: "ease",
          }}
          enableHover
        >
          <For each={ITEMS}>
            {(item, index) => (
              <div data-id={`card-${index()}`}>
                <div class="flex select-none flex-col space-y-1 p-4">
                  <h3 class="font-medium text-base text-zinc-800 dark:text-zinc-50">
                    {item.title}
                  </h3>
                  <p class="text-base text-zinc-600 dark:text-zinc-400">{item.description}</p>
                </div>
              </div>
            )}
          </For>
        </AnimatedBackground>
      </div>
    </Example>
  );
}

function SegmentedControl() {
  return (
    <Example title="Segmented Control">
      <div class="rounded-[8px] bg-gray-100 p-[2px] dark:bg-zinc-800">
        <AnimatedBackground
          defaultValue="Day"
          class="rounded-lg bg-white dark:bg-zinc-700"
          transition={{
            easing: "ease-in-out",
            duration: 0.2,
          }}
        >
          <For each={["Day", "Week", "Month", "Year"]}>
            {(label) => (
              <button
                data-id={label}
                type="button"
                aria-label={`${label} view`}
                class="inline-flex w-20 items-center justify-center text-center text-zinc-800 transition-transform active:scale-[0.98] dark:text-zinc-50"
              >
                {label}
              </button>
            )}
          </For>
        </AnimatedBackground>
      </div>
    </Example>
  );
}
