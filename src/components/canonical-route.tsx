import { For, lazy, onCleanup, onMount, Suspense } from "solid-js";
import { type CanonicalNode, getCanonicalNode, resolvePreviewRequest } from "@/lib/product-routing";

export function CanonicalPage(props: { node: CanonicalNode }) {
  return (
    <main
      data-product-surface={props.node.surface}
      data-canonical-route={props.node.path}
      class="mx-auto flex min-h-svh w-full max-w-5xl flex-col justify-center gap-3 p-8"
    >
      <h1 class="font-heading font-semibold text-4xl tracking-tight">{props.node.label}</h1>
      {props.node.description ? (
        <p class="max-w-2xl text-muted-foreground">{props.node.description}</p>
      ) : null}
      <For each={props.node.anchors}>
        {(anchor) => <span id={anchor} class="sr-only" aria-hidden="true" />}
      </For>
    </main>
  );
}

type PreviewKind = "components" | "blocks";

export function CanonicalPreview(props: { kind: PreviewKind; slug: string; fragment?: string }) {
  const ExampleComponent = lazy(() =>
    props.kind === "components"
      ? import(`../registry/kobalte/examples/ui/${props.slug}-example.tsx`)
      : import(`../registry/kobalte/examples/blocks/${props.slug}-example.tsx`),
  );

  onMount(() => {
    let fragment = props.fragment;
    if (!fragment) {
      const resolution = resolvePreviewRequest(
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
      if (resolution.accepted) fragment = resolution.fragment;
    }
    let observer: MutationObserver | undefined;
    const normalizeExampleAnchors = () => {
      const canonicalPath =
        props.kind === "components"
          ? `/components/${props.slug}`
          : `/components/blocks/${props.slug}`;
      const anchors = getCanonicalNode(canonicalPath)?.previewAnchors ?? [];
      for (const [index, example] of document
        .querySelectorAll<HTMLElement>('[data-slot="example"]')
        .entries()) {
        const anchor = anchors[index];
        if (anchor) example.id = anchor;
      }
    };
    const focusTarget = () => {
      normalizeExampleAnchors();
      if (!fragment) return false;
      const target = document.getElementById(fragment);
      if (!target) return false;
      observer?.disconnect();
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "start" });
      return true;
    };

    requestAnimationFrame(() => {
      observer = new MutationObserver(() => focusTarget());
      observer.observe(document.body, { childList: true, subtree: true });
      focusTarget();
    });
    onCleanup(() => observer?.disconnect());
  });

  return (
    <main data-preview-kind={props.kind} data-preview-slug={props.slug}>
      <Suspense>
        <ExampleComponent />
      </Suspense>
    </main>
  );
}

export function CreatePreview(props: { preset?: string }) {
  return (
    <main
      data-preview-kind="create"
      data-preset={props.preset ?? "default"}
      class="grid min-h-svh place-items-center p-8"
    >
      <div class="text-center">
        <h1 class="font-heading font-semibold text-3xl">Create Preview</h1>
        <p class="mt-2 text-muted-foreground">
          {props.preset ? `Preset ${props.preset}` : "Default Design Configuration"}
        </p>
      </div>
    </main>
  );
}

export function stableExampleAnchor(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replaceAll(" ", "-");
}
