import { Link, useNavigate } from "@tanstack/solid-router";
import { docs, ui } from "@velite";
import { createMemo } from "solid-js";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
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

type Option =
  | { pathname: string; slug: string; route: "/docs" }
  | { pathname: string; slug: string; route: "/docs/$slug" }
  | { pathname: string; slug: string; route: "/docs/installation/$slug" }
  | { pathname: string; slug: string; route: "/docs/components/$primitive/$slug" };

const getOptions = (): Option[] => {
  const docsOptions = docs.map((d) => {
    if (d.slug === "index") {
      return {
        pathname: "/docs",
        slug: d.slug,
        route: "/docs" as const,
      };
    }

    return {
      pathname: d.parent ? `/docs/${d.parent}/${d.slug}` : `/docs/${d.slug}`,
      slug: d.slug,
      route: d.parent ? ("/docs/installation/$slug" as const) : ("/docs/$slug" as const),
    };
  });

  const uiOptions = ui
    .toSorted((a, b) => a.title.localeCompare(b.title))
    .map((u) => ({
      pathname: `/docs/components/kobalte/${u.slug}`,
      slug: u.slug,
      route: "/docs/components/$primitive/$slug" as const,
    }));

  return [...docsOptions, ...uiOptions];
};

export function NotFoundPage() {
  const navigate = useNavigate();
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
          items={options()}
          itemToStringLabel={(option) => option.pathname}
          itemToStringValue={(option) => option.slug}
          onValueChange={(value) => {
            if (value) {
              if (value.route === "/docs/components/$primitive/$slug") {
                navigate({
                  to: value.route,
                  params: { primitive: "kobalte", slug: value.slug },
                });
                return;
              }
              if (value.route === "/docs") {
                navigate({ to: value.route });
                return;
              }
              navigate({
                to: value.route,
                params: { slug: value.slug },
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
            <ComboboxList>
              {(option: Option) => <ComboboxItem value={option}>{option.pathname}</ComboboxItem>}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <EmptyDescription>
          Need help? <Link to="/">Go to homepage</Link>
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
