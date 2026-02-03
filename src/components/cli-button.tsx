import { useSearch } from "@tanstack/solid-router";
import { Check, Copy, SquareTerminal } from "lucide-solid";
import { createEffect, createMemo, createSignal, For, onCleanup } from "solid-js";
import { toast } from "solid-sonner";
import { DEFAULT_CONFIG } from "@/lib/config";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

const PACKAGE_MANAGER_PREFIXES: Record<PackageManager, string> = {
  pnpm: "pnpm dlx",
  npm: "npx",
  yarn: "yarn dlx",
  bun: "bunx --bun",
};

export function CliButton() {
  const [packageManager, setPackageManager] = createSignal<PackageManager>("bun");
  const [hasCopied, setHasCopied] = createSignal(false);
  const search = useSearch({ strict: false });

  createEffect(() => {
    if (hasCopied()) {
      const timer = setTimeout(() => setHasCopied(false), 2000);
      onCleanup(() => clearTimeout(timer));
    }
  });

  const commands = createMemo(() => {
    const params = search() as Record<string, string | undefined>;
    const font = params.font ?? DEFAULT_CONFIG.font;
    const theme = params.theme ?? DEFAULT_CONFIG.theme;
    const radius = params.radius ?? DEFAULT_CONFIG.radius;
    const style = params.style ?? DEFAULT_CONFIG.style;
    const baseColor = params.baseColor ?? DEFAULT_CONFIG.baseColor;

    // Build packages list, avoiding duplicates when baseColor and theme are the same
    const packagesList = [
      `@zaidan/font-${font}`,
      `@zaidan/${theme}`,
      `@zaidan/radius-${radius}`,
      `@zaidan/style-${style}`,
    ];

    // Only add baseColor if it's different from theme
    if (baseColor !== theme) {
      packagesList.push(`@zaidan/${baseColor}`);
    }

    const packages = packagesList.join(" ");

    return Object.fromEntries(
      Object.entries(PACKAGE_MANAGER_PREFIXES).map(([pm, prefix]) => [
        pm,
        `${prefix} shadcn@latest add ${packages}`,
      ]),
    ) as Record<PackageManager, string>;
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(commands()[packageManager()]);
      setHasCopied(true);
      toast.success("Command copied to clipboard");
    } catch (err) {
      console.error("Failed to copy command:", err);
      toast.error("Failed to copy command");
    }
  };

  return (
    <Dialog>
      <DialogTrigger as={Button} size="sm">
        <SquareTerminal />
        <span class="hidden sm:inline">Setup Project</span>
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
  );
}
