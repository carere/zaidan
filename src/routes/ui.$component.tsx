import { ClientOnly, createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { lazy, Show } from "solid-js";
import { MDXContent } from "@/components/mdx-content";
import { useStyle } from "@/lib/style-context";
import { cn } from "@/lib/utils";
import { useView } from "@/lib/view-context";
import "@/styles/mdx.css";

export const Route = createFileRoute("/ui/$component")({
  loader: ({ params }) => {
    const doc = ui.find((u) => u.slug === params.component);
    if (!doc) {
      throw notFound({
        data: {
          component: params.component,
        },
      });
    }
    return doc;
  },
  component: RouteComponent,
  notFoundComponent: (props) => {
    return <div>Component not found: {(props.data as { component: string }).component}</div>;
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
        "relative sm:h-[calc(100svh-var(--header-height)-2rem)] h-[calc(100svh-2*var(--header-height)-1rem)] overflow-y-auto",
        {
          "border rounded-lg no-scrollbar": view() === "preview",
        },
      )}
    >
      <Show
        when={view() === "preview"}
        fallback={
          <div class="flex flex-col mx-auto max-w-5xl p-6">
            <ClientOnly fallback={<div>Loading documentation...</div>}>
              <MDXContent code={doc().code} />
            </ClientOnly>
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
