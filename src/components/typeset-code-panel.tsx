import { Link } from "@tanstack/solid-router";
import { Check, Copy } from "lucide-solid";
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";
import { TYPESET_MEASURES, type TypesetParams, typesetPresetCss } from "@/lib/typeset";
import { encodeTypesetCode } from "@/lib/typeset-code";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";

/**
 * "Get Code" for the typeset builder. Docs tab walks the install; Prompt tab
 * emits one agent-ready prompt with the current picks baked in.
 *
 * Upstream ships the raw `typeset.css` for the user to copy, because shadcn
 * distributes typeset as copy-paste. Zaidan ships it as a registry item, so
 * step 1 is a CLI command instead of a file dump.
 */

/**
 * One item installs the lot: `@zaidan/typeset-<code>` is a virtual registry
 * item that pulls in `@zaidan/typeset`, the faces this design uses, and the
 * `.typeset-<item>` preset class.
 */
function installCommand(params: TypesetParams) {
  return `bunx --bun shadcn@latest add @zaidan/typeset-${encodeTypesetCode(params)}`;
}

function wrapperSnippet(params: TypesetParams) {
  const width = TYPESET_MEASURES.find((option) => option.value === params.measure)?.width;
  return `<div class="typeset typeset-${params.item} max-w-[${width}]">
  {content}
</div>`;
}

function agentPrompt(params: TypesetParams) {
  const preset = typesetPresetCss(params);

  return `Install Zaidan's typeset in this project.

Typeset is a single stylesheet that styles rendered markdown: wrap the output in a \`typeset\` container and everything inside (headings, lists, tables, code, blockquotes, math) is styled. Everything outside is untouched.

1. Add the stylesheet, the fonts it needs, and the preset:

${installCommand(params)}

This writes styles/typeset.css, adds the @import to the project's main CSS file, installs the fonts, and appends the .typeset-${params.item} preset below.

2. Check the result. If a class named .typeset-${params.item} already existed, merge the values by hand so only these remain. Leave any other typeset-* presets untouched: they are separate surfaces:

${preset}

3. Do not apply the class anywhere yet. Search the project for surfaces that render markdown or rich content: solid-markdown, MDX components, innerHTML with parsed markdown, prose classes, CMS content renderers. Present the candidates you find as a short list and ask the user which surface should use typeset. Then wrap only the surface they pick:

${wrapperSnippet(params)}

If the picked surface already has its own typography (a prose class, styled markdown components), list those styles and let the user decide what to remove before wrapping.

Notes:

- This is a SolidJS project: use \`class\`, not \`className\`.
- To exclude an embedded component from typeset styles, add the not-typeset class or the data-not-typeset attribute to it.
- Verify on the surface the user picked: headings, lists, tables, and code inside the container should be styled with no classes on the content itself.
- Docs: https://zaidan.carere.dev/docs/typeset`;
}

function CopyButton(props: { value: string; label: string }) {
  const [copied, setCopied] = createSignal(false);

  createEffect(() => {
    if (copied()) {
      const timer = setTimeout(() => setCopied(false), 2000);
      onCleanup(() => clearTimeout(timer));
    }
  });

  return (
    <Button
      variant="outline"
      size="sm"
      class="w-fit"
      onClick={async () => {
        await navigator.clipboard.writeText(props.value);
        setCopied(true);
      }}
    >
      {copied() ? <Check class="size-4" /> : <Copy class="size-4" />}
      {props.label}
    </Button>
  );
}

function CodeBlock(props: { children: string; class?: string }) {
  return (
    <div class="relative overflow-hidden rounded-lg border bg-surface px-3 py-2.5 text-surface-foreground">
      <div class="no-scrollbar overflow-x-auto">
        <pre class="whitespace-pre font-mono text-xs leading-relaxed">{props.children}</pre>
      </div>
    </div>
  );
}

function Step(props: { step: number; title: string; children: unknown }) {
  return (
    <section class="flex flex-col gap-2.5">
      <h3 class="font-medium text-sm">
        <span class="text-muted-foreground tabular-nums">{props.step}.</span> {props.title}
      </h3>
      {props.children as never}
    </section>
  );
}

function PanelBody(props: { params: TypesetParams }) {
  const preset = createMemo(() => typesetPresetCss(props.params));
  const prompt = createMemo(() => agentPrompt(props.params));
  const install = createMemo(() => installCommand(props.params));

  return (
    <Tabs defaultValue="docs" class="flex min-h-0 flex-1 flex-col gap-0">
      <div class="flex items-center justify-between gap-2 border-b px-4 py-3">
        <TabsList>
          <TabsTrigger value="docs">Docs</TabsTrigger>
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
        </TabsList>
      </div>
      <div class="no-scrollbar min-h-0 flex-1 scroll-fade overflow-y-auto p-4 md:p-6">
        <TabsContent value="docs" class="flex flex-col gap-6">
          <Step step={1} title="Install your typeset">
            <p class="text-muted-foreground text-sm">
              Adds <code class="font-mono">styles/typeset.css</code>, the{" "}
              <code class="font-mono">@import</code> to your main CSS file, the fonts, and the
              preset below.
            </p>
            <CodeBlock>{install()}</CodeBlock>
            <CopyButton value={install()} label="Copy command" />
          </Step>
          <Step step={2} title="Your preset">
            <p class="text-muted-foreground text-sm">
              The command writes this for you. Paste it after the typeset import instead if you'd
              rather not run the CLI.
            </p>
            <CodeBlock>{preset()}</CodeBlock>
            <CopyButton value={preset()} label="Copy CSS" />
          </Step>
          <Step step={3} title="Wrap your content">
            <CodeBlock>{wrapperSnippet(props.params)}</CodeBlock>
          </Step>
        </TabsContent>
        <TabsContent value="prompt" class="flex flex-col gap-2.5">
          <p class="text-muted-foreground text-sm">
            One prompt with your picks baked in. Copy it and paste it into your coding agent.
          </p>
          <div class="max-h-102 scroll-fade overflow-y-auto">
            <CodeBlock>{prompt()}</CodeBlock>
          </div>
          <CopyButton value={prompt()} label="Copy prompt" />
        </TabsContent>
      </div>
    </Tabs>
  );
}

export function TypesetCodePanel(props: { params: TypesetParams; variant?: "panel" | "drawer" }) {
  return (
    <Show
      when={props.variant === "drawer"}
      fallback={
        <div class="hidden w-88 flex-col items-start gap-3 xl:flex 2xl:w-104">
          <div class="isolate flex max-h-[calc(100vh-16rem)] w-full flex-col overflow-hidden rounded-2xl bg-background ring-1 ring-foreground/10">
            <PanelBody params={props.params} />
          </div>
          <Button
            as={Link}
            to="/docs/typeset"
            variant="link"
            size="sm"
            class="text-muted-foreground"
          >
            Read the docs
          </Button>
        </div>
      }
    >
      <Dialog>
        <DialogTrigger
          as={Button}
          variant="outline"
          class="min-w-0 flex-1 touch-manipulation select-none bg-transparent! px-2! py-0! text-sm! transition-none hover:bg-muted! md:flex-none xl:hidden pointer-coarse:h-10!"
        >
          Get Code
        </DialogTrigger>
        <DialogContent class="flex max-h-[85svh] min-w-0 flex-col overflow-hidden rounded-xl p-0 sm:max-w-lg">
          <DialogHeader class="px-4 pt-4">
            <DialogTitle>Get Code</DialogTitle>
            <DialogDescription>Install typeset with the values you picked.</DialogDescription>
          </DialogHeader>
          <PanelBody params={props.params} />
        </DialogContent>
      </Dialog>
    </Show>
  );
}
