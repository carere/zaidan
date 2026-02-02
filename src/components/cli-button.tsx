import { useSearch } from "@tanstack/solid-router";
import { Check, Copy, Terminal } from "lucide-solid";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
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
  const [open, setOpen] = createSignal(false);
  const [packageManager, setPackageManager] = createSignal<PackageManager>("pnpm");
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

    const packages = [
      `@zaidan/${font}`,
      `@zaidan/${theme}`,
      `@zaidan/${radius}`,
      `@zaidan/${style}`,
      `@zaidan/${baseColor}`,
    ].join(" ");

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

  const handleCopyAndClose = async () => {
    await handleCopy();
    setOpen(false);
  };

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          as={DialogTrigger}
          asChild={false}
          class="z-button z-button-size-sm z-button-variant-outline inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap outline-none transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
        >
          <Terminal />
          <span class="hidden sm:inline">CLI</span>
        </TooltipTrigger>
        <TooltipContent>Copy CLI Command</TooltipContent>
      </Tooltip>

      <DialogContent class="dialog-ring rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install Configuration</DialogTitle>
          <DialogDescription>
            Run this command to add your design system configuration to your project.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={packageManager()}
          onChange={(value) => setPackageManager(value as PackageManager)}
        >
          <div class="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="pnpm" class="font-mono">
                pnpm
              </TabsTrigger>
              <TabsTrigger value="npm" class="font-mono">
                npm
              </TabsTrigger>
              <TabsTrigger value="yarn" class="font-mono">
                yarn
              </TabsTrigger>
              <TabsTrigger value="bun" class="font-mono">
                bun
              </TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
              {hasCopied() ? <Check /> : <Copy />}
              <span class="sr-only">Copy command</span>
            </Button>
          </div>

          <TabsContent value="pnpm" class="mt-2">
            <pre class="overflow-x-auto whitespace-nowrap rounded-lg bg-muted p-4 font-mono text-sm">
              {commands().pnpm}
            </pre>
          </TabsContent>
          <TabsContent value="npm" class="mt-2">
            <pre class="overflow-x-auto whitespace-nowrap rounded-lg bg-muted p-4 font-mono text-sm">
              {commands().npm}
            </pre>
          </TabsContent>
          <TabsContent value="yarn" class="mt-2">
            <pre class="overflow-x-auto whitespace-nowrap rounded-lg bg-muted p-4 font-mono text-sm">
              {commands().yarn}
            </pre>
          </TabsContent>
          <TabsContent value="bun" class="mt-2">
            <pre class="overflow-x-auto whitespace-nowrap rounded-lg bg-muted p-4 font-mono text-sm">
              {commands().bun}
            </pre>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <DialogClose as={Button} variant="outline">
            Close
          </DialogClose>
          <Button onClick={handleCopyAndClose}>Copy Command</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
