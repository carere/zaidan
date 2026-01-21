import { useLocation, useNavigate } from "@tanstack/solid-router";
import { docs, ui } from "@velite";
import { createMemo } from "solid-js";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxSection,
  ComboboxSectionLabel,
} from "@/registry/ui/combobox";
import type { FileRouteTypes } from "@/routeTree.gen";

// ============================================================================
// Types
// ============================================================================

type Entry = {
  title: string;
  items: typeof docs | typeof ui;
  route: FileRouteTypes["to"];
};

type ComboboxOption = {
  slug: string;
  title: string;
  section: string;
  route: FileRouteTypes["to"];
};

type ComboboxGroup = {
  label: string;
  options: ComboboxOption[];
};

// ============================================================================
// Data
// ============================================================================

const entries: Entry[] = [
  {
    title: "Getting Started",
    items: docs,
    route: "/{-$slug}",
  },
  {
    title: "UI",
    items: ui.sort((a, b) => a.title.localeCompare(b.title)),
    route: "/ui/$slug",
  },
];

const groupedEntries: ComboboxGroup[] = entries.map((entry) => ({
  label: entry.title,
  options: entry.items.map((item) => ({
    slug: item.slug,
    title: item.title,
    section: entry.title,
    route: entry.route,
  })),
}));

// Flatten all options for lookup
const allOptions = groupedEntries.flatMap((group) => group.options);

// ============================================================================
// Component
// ============================================================================

export function ItemPicker() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentOption = createMemo<ComboboxOption | null>(() => {
    const pathname = location().pathname;

    // Check if we're on a UI page (/ui/{slug})
    if (pathname.startsWith("/ui/")) {
      const slug = pathname.slice(4); // Remove "/ui/"
      const option = allOptions.find((o) => o.route === "/ui/$slug" && o.slug === slug);
      return option ?? null;
    }

    // Check if we're on a docs page (/ or /{slug})
    const slug = pathname === "/" ? "home" : pathname.slice(1);
    const option = allOptions.find((o) => o.route === "/{-$slug}" && o.slug === slug);
    return option ?? null;
  });

  const handleChange = (option: ComboboxOption | null) => {
    if (!option) return;

    if (option.route === "/{-$slug}") {
      navigate({ to: "/{-$slug}", params: { slug: option.slug } });
    } else if (option.route === "/ui/$slug") {
      navigate({ to: "/ui/$slug", params: { slug: option.slug } });
    }
  };

  return (
    <Combobox<ComboboxOption, ComboboxGroup>
      options={groupedEntries}
      optionValue="slug"
      optionLabel="title"
      optionTextValue="title"
      optionGroupChildren="options"
      placeholder="Search pages..."
      value={currentOption()}
      onChange={handleChange}
      sectionComponent={(props) => (
        <ComboboxSection>
          <ComboboxSectionLabel>{props.section.rawValue.label}</ComboboxSectionLabel>
        </ComboboxSection>
      )}
      itemComponent={(props) => (
        <ComboboxItem item={props.item}>{props.item.rawValue.title}</ComboboxItem>
      )}
    >
      <ComboboxInput class="w-40" placeholder="Search pages..." />
      <ComboboxContent />
    </Combobox>
  );
}
