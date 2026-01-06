import { ClientOnly, createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { lazy } from "solid-js";
import { MDXContent } from "@/components/mdx-content";
import { useStyle } from "@/lib/style-context";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/ui/tabs";
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
  const doc = Route.useLoaderData();
  const ExampleComponent = lazy(() => import(`../registry/examples/${doc().slug}-example.tsx`));

  return (
    <Tabs
      defaultValue="preview"
      class="relative sm:h-[calc(100svh-var(--header-height)-2rem)] h-[calc(100svh-2*var(--header-height)-1rem)] overflow-y-auto no-scrollbar border rounded-lg"
    >
      <TabsList variant="line" class="sticky top-2 left-2 z-50">
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="docs">Docs</TabsTrigger>
      </TabsList>

      <TabsContent
        value="preview"
        class={cn({
          "style-vega": style() === "vega",
          "style-nova": style() === "nova",
          "style-lyra": style() === "lyra",
          "style-maia": style() === "maia",
          "style-mira": style() === "mira",
        })}
      >
        <ExampleComponent />
      </TabsContent>

      <TabsContent value="docs" class="flex flex-col mx-auto max-w-5xl">
        <ClientOnly fallback={<div>Loading documentation...</div>}>
          <MDXContent code={doc().code} />
        </ClientOnly>
      </TabsContent>
    </Tabs>
  );
}
