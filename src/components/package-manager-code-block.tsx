import { makePersisted, messageSync } from "@solid-primitives/storage";
import { Check, Copy, Terminal } from "lucide-solid";
import { createEffect, createSignal, For, onCleanup, type Signal } from "solid-js";
import { isServer } from "solid-js/web";
import { getStorage } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";

const PACKAGE_MANAGERS = ["pnpm", "npm", "yarn", "bun"] as const;

type PackageManager = (typeof PACKAGE_MANAGERS)[number];

type PackageManagerCodeBlockProps = Record<PackageManager, string>;

const packageManagerSync = isServer
  ? undefined
  : messageSync(new BroadcastChannel("package-manager-code-block"));

export function PackageManagerCodeBlock(props: PackageManagerCodeBlockProps) {
  const [packageManager, setPackageManager] = makePersisted<PackageManager, Signal<PackageManager>>(
    createSignal("bun" as PackageManager),
    {
      name: "package-manager",
      storage: getStorage(),
      sync: packageManagerSync,
    },
  );
  const [hasCopied, setHasCopied] = createSignal(false);

  createEffect(() => {
    if (!hasCopied()) return;

    const timer = setTimeout(() => setHasCopied(false), 2000);
    onCleanup(() => clearTimeout(timer));
  });

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(props[packageManager()]);
      setHasCopied(true);
    } catch (error) {
      console.error("Failed to copy package manager command:", error);
    }
  };

  return (
    <div
      data-not-typeset
      data-slot="package-manager-code-block"
      class="relative mt-6 overflow-hidden rounded-[18px] bg-surface text-sm leading-[1.75] text-surface-foreground first:mt-0"
      style={{ "font-family": '"Geist Mono Variable", monospace' }}
    >
      <div class="overflow-x-auto">
        <Tabs
          value={packageManager()}
          class="gap-0"
          onChange={(value) => setPackageManager(value as PackageManager)}
        >
          <div class="flex items-center gap-2 border-border/50 border-b px-3 py-1">
            <div class="flex size-4 items-center justify-center rounded-[1px] bg-foreground opacity-70">
              <Terminal class="size-3 text-surface" />
            </div>
            <TabsList class="rounded-none bg-transparent p-0">
              <For each={PACKAGE_MANAGERS}>
                {(item) => (
                  <TabsTrigger
                    value={item}
                    class="h-7 border border-transparent pt-0.5 shadow-none! data-selected:border-input data-selected:bg-background!"
                  >
                    {item}
                  </TabsTrigger>
                )}
              </For>
            </TabsList>
          </div>

          <div class="no-scrollbar overflow-x-auto">
            <For each={PACKAGE_MANAGERS}>
              {(item) => (
                <TabsContent
                  forceMount
                  value={item}
                  class="mt-0 hidden px-4 py-3.5 leading-[1.75]! data-selected:block"
                >
                  <pre>
                    <code class="relative whitespace-nowrap text-sm leading-none">
                      {props[item]}
                    </code>
                  </pre>
                </TabsContent>
              )}
            </For>
          </div>
        </Tabs>

        <Button
          data-slot="copy-button"
          size="icon"
          variant="ghost"
          class="absolute top-2 right-2 z-10 size-7 opacity-70 hover:opacity-100 focus-visible:opacity-100"
          onClick={copyCommand}
        >
          <span class="sr-only">Copy</span>
          {hasCopied() ? <Check /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}
