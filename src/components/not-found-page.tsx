import { Link, useNavigate, useSearch } from "@tanstack/solid-router";
import { docs, shadcn } from "@velite";
import { createMemo } from "solid-js";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
} from "@/registry/kobalte/ui/combobox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/registry/kobalte/ui/empty";
import { InputGroupAddon } from "@/registry/kobalte/ui/input-group";
import { Kbd } from "@/registry/kobalte/ui/kbd";
import type { FileRouteTypes } from "@/routeTree.gen";

type Option = {
  pathname: string;
  slug: string;
  route: FileRouteTypes["to"];
};

const getOptions = (): Option[] => {
  const docsOptions = docs.map((d) => ({
    pathname: d.parent ? `/${d.parent}/${d.slug}` : `/${d.slug}`,
    slug: d.slug,
    route: (d.parent ? `/${d.parent}/${d.slug}` : "/{-$slug}") as FileRouteTypes["to"],
  }));

  const shadcnOptions = shadcn
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((u) => ({
      pathname: `/ui/${u.slug}`,
      slug: u.slug,
      route: "/ui/{-$slug}" as FileRouteTypes["to"],
    }));

  return [...docsOptions, ...shadcnOptions];
};

export function NotFoundPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const options = createMemo(() => getOptions());

  return (
    <Empty class="border">
      <EmptyHeader>
        <EmptyTitle>404 - Not Found</EmptyTitle>
        <EmptyDescription>
          "The page you're looking for doesn't exist. Try searching for what you need below."
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Combobox<Option>
          options={options()}
          optionValue="slug"
          optionTextValue="pathname"
          placeholder="Type / to search pages..."
          class="w-3/4"
          itemComponent={(props) => (
            <ComboboxItem item={props.item}>{props.item.rawValue.pathname}</ComboboxItem>
          )}
          onChange={(value) => {
            if (value) {
              navigate({
                to: value.route,
                params: { slug: value.slug },
                search: search(),
              });
            }
          }}
        >
          <ComboboxInput placeholder="Type / to search pages..." showTrigger={false}>
            <InputGroupAddon align="inline-end">
              <Kbd>/</Kbd>
            </InputGroupAddon>
          </ComboboxInput>
          <ComboboxContent class="no-scrollbar max-h-96">
            <ComboboxEmpty>No pages found.</ComboboxEmpty>
          </ComboboxContent>
        </Combobox>
        <EmptyDescription>
          Need help? <Link to="/">Go to homepage</Link>
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
