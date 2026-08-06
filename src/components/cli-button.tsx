import { Check, Copy } from "lucide-solid";
import { createEffect, createMemo, createSignal, For, onCleanup } from "solid-js";
import { DEFAULT_CONFIG } from "@/lib/config";
import { encodeDesignSystemPreset } from "@/lib/preset";
import type { DesignSystemConfig } from "@/lib/types";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import { FieldGroup } from "@/registry/kobalte/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";
import { createToastManager, Toaster } from "@/registry/kobalte/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

const PACKAGE_MANAGER_PREFIXES: Record<PackageManager, string> = {
  pnpm: "pnpm dlx",
  npm: "npx",
  yarn: "yarn dlx",
  bun: "bunx --bun",
};

export function CliButton(
  props: { preset?: string; config?: DesignSystemConfig; class?: string; label?: string } = {},
) {
  const [packageManager, setPackageManager] = createSignal<PackageManager>("bun");
  const [hasCopied, setHasCopied] = createSignal(false);
  const toastManager = createToastManager();

  createEffect(() => {
    if (hasCopied()) {
      const timer = setTimeout(() => setHasCopied(false), 2000);
      onCleanup(() => clearTimeout(timer));
    }
  });

  const commands = createMemo(() => {
    const registryItems = (() => {
      if (props.preset || props.config) {
        const preset = props.preset ?? encodeDesignSystemPreset(props.config ?? DEFAULT_CONFIG);
        return [`@zaidan/preset-${preset}`];
      }

      const config = DEFAULT_CONFIG;
      const items = [
        `@zaidan/font-${config.font}`,
        `@zaidan/${config.theme}`,
        `@zaidan/style-${config.style}`,
      ];

      if (config.headingFont !== config.font) {
        items.push(`@zaidan/font-${config.headingFont}`);
      }
      if (config.radius !== "default") {
        items.push(`@zaidan/radius-${config.radius}`);
      }
      if (config.baseColor !== config.theme) {
        items.push(`@zaidan/${config.baseColor}`);
      }
      if (config.chartColor !== config.theme && config.chartColor !== config.baseColor) {
        items.push(`@zaidan/chart-${config.chartColor}`);
      }

      return items;
    })();

    return Object.fromEntries(
      Object.entries(PACKAGE_MANAGER_PREFIXES).map(([pm, prefix]) => [
        pm,
        `${prefix} shadcn@latest add ${registryItems.join(" ")}`,
      ]),
    ) as Record<PackageManager, string>;
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(commands()[packageManager()]);
      setHasCopied(true);
      toastManager.add({ type: "success", title: "Command copied to clipboard" });
    } catch (err) {
      console.error("Failed to copy command:", err);
      toastManager.add({
        type: "error",
        title: "Failed to copy command",
        priority: "high",
      });
    }
  };

  return (
    <>
      <Toaster toastManager={toastManager} />
      <Dialog>
        <DialogTrigger as={Button} size="sm" class={props.class}>
          <span>{props.label ?? "Setup Project"}</span>
        </DialogTrigger>

        <DialogContent class="min-w-0 overflow-hidden rounded-xl ring-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install Configuration</DialogTitle>
            <DialogDescription>
              Run this command to add your design system configuration to your project.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup class="gap-3">
            <Tabs
              class="min-w-0 gap-0 overflow-hidden rounded-lg border bg-surface"
              value={packageManager()}
              onChange={(value) => setPackageManager(value as PackageManager)}
            >
              <div class="flex items-center gap-2 p-2">
                <TabsList class="h-auto rounded-none bg-transparent p-0 font-mono *:data-[slot=tabs-trigger]:data-[state=active]:border-input *:data-[slot=tabs-trigger]:h-7 *:data-[slot=tabs-trigger]:border *:data-[slot=tabs-trigger]:border-transparent *:data-[slot=tabs-trigger]:pt-0.5 *:data-[slot=tabs-trigger]:shadow-none! group-data-[orientation=horizontal]/tabs:h-8">
                  <TabsTrigger value="pnpm">pnpm</TabsTrigger>
                  <TabsTrigger value="npm">npm</TabsTrigger>
                  <TabsTrigger value="yarn">yarn</TabsTrigger>
                  <TabsTrigger value="bun">bun</TabsTrigger>
                </TabsList>
                <Tooltip>
                  <TooltipTrigger
                    as={Button}
                    class="ml-auto size-7 rounded-lg"
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleCopy}
                  >
                    {hasCopied() ? <Check class="size-4" /> : <Copy class="size-4" />}
                    <span class="sr-only">Copy command</span>
                  </TooltipTrigger>
                  <TooltipContent>{hasCopied() ? "Copied!" : "Copy command"}</TooltipContent>
                </Tooltip>
              </div>

              <For each={Object.entries(commands())}>
                {([pm, cmd]) => (
                  <TabsContent value={pm}>
                    <div class="relative overflow-hidden border-border/50 border-t bg-surface px-3 py-3 text-surface-foreground">
                      <div class="no-scrollbar overflow-x-auto">
                        <code class="whitespace-nowrap font-mono text-sm">{cmd}</code>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </For>
            </Tabs>
          </FieldGroup>

          <DialogFooter class="-mx-6 mt-2 -mb-6 flex flex-col gap-2 border-t bg-muted/50 p-6 sm:flex-col">
            <DialogClose as={Button} size="sm" class="h-9 w-full rounded-lg" onClick={handleCopy}>
              Copy Command
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
