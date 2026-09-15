import { Link } from "@tanstack/solid-router";
import { blocks } from "@velite";
import { For } from "solid-js";

const sortedBlocks = [...blocks].sort((a, b) => a.title.localeCompare(b.title));

export function BlocksList() {
  return (
    <div data-not-typeset class="not-prose grid gap-x-6 gap-y-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
      <For each={sortedBlocks}>
        {(block) => (
          <Link
            to="/docs/blocks/$primitive/$slug"
            params={{ primitive: "kobalte", slug: block.slug }}
            class="font-medium text-sm underline-offset-4 hover:underline"
          >
            {block.title}
          </Link>
        )}
      </For>
    </div>
  );
}
