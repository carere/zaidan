import { ClientOnly, createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { MDXContent } from "@/components/mdx-content";
import { useStyle } from "@/lib/style-context";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/ui/tabs";

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

  return (
    <Tabs defaultValue="preview" class="flex-1">
      <TabsList variant="line">
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
        {/* Replace with the example component (eg. <ButtonExample />, <AlertDialogExample />, etc.). Use <Dynamic /> to render the component. */}
      </TabsContent>

      <TabsContent value="docs">
        <ClientOnly fallback={<div>Loading documentation...</div>}>
          <MDXContent code={doc().code} />
        </ClientOnly>
      </TabsContent>
    </Tabs>
  );
}
