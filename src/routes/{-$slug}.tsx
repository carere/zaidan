import { ClientOnly, createFileRoute, notFound } from "@tanstack/solid-router";
import { docs } from "@velite";
import { MDXContent } from "@/components/mdx-content";

export const Route = createFileRoute("/{-$slug}")({
  loader: ({ params }) => {
    const doc = docs.find((d) => (params.slug ? d.slug === params.slug : d.slug === "home"));
    if (!doc) {
      throw notFound({
        data: {
          slug: params.slug,
        },
      });
    }
    return doc.code;
  },
  component: RouteComponent,
  notFoundComponent: (props) => <div>Doc not found: {(props.data as { slug: string }).slug}</div>,
});

function RouteComponent() {
  const code = Route.useLoaderData();

  return (
    <div class="flex flex-col items-center overflow-y-auto">
      <ClientOnly fallback={<div>Loading...</div>}>
        <MDXContent code={code()} />
      </ClientOnly>
    </div>
  );
}
