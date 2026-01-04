import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { useStyle } from "@/lib/style-context";
import { cn } from "@/lib/utils";

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
    <div
      class={cn({
        "style-vega": style() === "vega",
        "style-nova": style() === "nova",
        "style-lyra": style() === "lyra",
        "style-maia": style() === "maia",
        "style-mira": style() === "mira",
      })}
    >
      {/* TODO: Implement actual component rendering using doc data */}
      <div>Component: {doc().slug}</div>
    </div>
  );
}
