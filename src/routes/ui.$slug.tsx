import { ClientOnly, createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { lazy, Show } from "solid-js";
import { MDXContent } from "@/components/mdx-content";
import { TableOfContents } from "@/components/toc";
import { useStyle } from "@/lib/style-context";
import { cn } from "@/lib/utils";
import { useView } from "@/lib/view-context";

export const Route = createFileRoute("/ui/$slug")({
  loader: ({ params }) => {
    const doc = ui.find((u) => u.slug === params.slug);
    if (!doc) {
      throw notFound({
        data: {
          slug: params.slug,
        },
      });
    }
    return doc;
  },
  component: RouteComponent,
  notFoundComponent: (props) => {
    return <div>Component not found: {(props.data as { slug: string }).slug}</div>;
  },
});

function RouteComponent() {
  const { style } = useStyle();
  const { view } = useView();
  const doc = Route.useLoaderData();
  const ExampleComponent = lazy(() => import(`../registry/examples/${doc().slug}-example.tsx`));

  return (
    <div
      class={cn(
        "no-scrollbar h-[calc(100svh-2*var(--header-height)-1rem)] scroll-pt-[calc(var(--header-height)+0.25rem)] overflow-y-auto scroll-smooth sm:h-[calc(100svh-var(--header-height)-2rem)]",
        {
          "rounded-lg border": view() === "preview",
        },
      )}
    >
      <Show
        when={view() === "preview"}
        fallback={
          <div class="mx-auto flex max-w-5xl gap-24 p-6">
            <div class="min-w-0 flex-1">
              <ClientOnly fallback={<div>Loading documentation...</div>}>
                <MDXContent code={doc().code} />
              </ClientOnly>
            </div>
            <TableOfContents toc={doc().toc} />
          </div>
        }
      >
        <div
          class={cn({
            "style-vega": style() === "vega",
            "style-nova": style() === "nova",
            "style-lyra": style() === "lyra",
            "style-maia": style() === "maia",
            "style-mira": style() === "mira",
          })}
        >
          <ExampleComponent />
        </div>
      </Show>
    </div>
  );
}
