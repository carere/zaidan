import { Link } from "@tanstack/solid-router";
import { ui } from "@velite";
import { For } from "solid-js";

const components = [...ui].sort((a, b) => a.title.localeCompare(b.title));

export function ComponentsList() {
  return (
    <div data-not-typeset class="not-prose grid gap-x-6 gap-y-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
      <For each={components}>
        {(component) => (
          <Link
            to="/docs/components/$primitive/$slug"
            params={{ primitive: "kobalte", slug: component.slug }}
            class="font-medium text-sm underline-offset-4 hover:underline"
          >
            {component.title}
          </Link>
        )}
      </For>
    </div>
  );
}
