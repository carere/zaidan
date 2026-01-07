import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { TocEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TableOfContentsProps {
  toc: TocEntry;
  class?: string;
}

/**
 * Flattens nested TOC entries into a list of URL fragments for scroll spy
 */
function flattenTocUrls(entries: TocEntry): string[] {
  const urls: string[] = [];
  for (const entry of entries) {
    urls.push(entry.url);
    if (entry.items.length > 0) {
      urls.push(...flattenTocUrls(entry.items));
    }
  }
  return urls;
}

/**
 * Recursive component to render TOC items with proper nesting
 */
function TocItems(props: { items: TocEntry; activeId: string; depth?: number }) {
  const depth = () => props.depth ?? 0;

  return (
    <For each={props.items}>
      {(item) => (
        <li>
          <a
            href={item.url}
            class={cn(
              "inline-block py-1 text-sm transition-colors hover:text-foreground",
              props.activeId === item.url.slice(1)
                ? "font-medium text-foreground"
                : "text-muted-foreground",
              {
                "pl-0": depth() === 0,
                "pl-4": depth() === 1,
                "pl-8": depth() >= 2,
              },
            )}
          >
            {item.title}
          </a>
          <Show when={item.items.length > 0}>
            <ul>
              <TocItems items={item.items} activeId={props.activeId} depth={depth() + 1} />
            </ul>
          </Show>
        </li>
      )}
    </For>
  );
}

/**
 * Table of Contents component with scroll spy functionality
 * Displays on xl screens and larger, sticky positioned on the right side
 */
export function TableOfContents(props: TableOfContentsProps) {
  const [activeId, setActiveId] = createSignal("");

  onMount(() => {
    // Get all heading IDs from the TOC
    const headingIds = flattenTocUrls(props.toc).map((url) => url.slice(1));

    // Find all heading elements
    const headingElements = headingIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (headingElements.length === 0) return;

    // Create an IntersectionObserver to track which heading is in view
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible heading
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);

        if (visibleEntries.length > 0) {
          // Sort by their position in the document and pick the first one
          const sorted = visibleEntries.sort((a, b) => {
            const rectA = a.boundingClientRect;
            const rectB = b.boundingClientRect;
            return rectA.top - rectB.top;
          });
          setActiveId(sorted[0].target.id);
        } else {
          // If no headings are visible, find the one we've scrolled past
          const scrollPosition = window.scrollY + 100;
          let closestHeading = headingElements[0];

          for (const heading of headingElements) {
            if (heading.offsetTop <= scrollPosition) {
              closestHeading = heading;
            }
          }

          setActiveId(closestHeading.id);
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    // Observe all heading elements
    for (const element of headingElements) {
      observer.observe(element);
    }

    // Set initial active heading
    if (headingElements.length > 0) {
      setActiveId(headingElements[0].id);
    }

    onCleanup(() => {
      observer.disconnect();
    });
  });

  // Skip rendering if TOC is empty or only has one top-level item with no children
  const shouldRender = () => {
    if (props.toc.length === 0) return false;
    const totalItems = flattenTocUrls(props.toc).length;
    return totalItems > 1;
  };

  return (
    <Show when={shouldRender()}>
      <nav
        class={cn(
          "sticky top-[calc(var(--header-height)+1.5rem)] hidden h-fit max-h-[calc(100vh-var(--header-height)-3rem)] w-56 shrink-0 overflow-y-auto xl:block",
          props.class,
        )}
        aria-label="Table of contents"
      >
        <div class="pb-4">
          <p class="mb-2 font-medium text-sm">On This Page</p>
          <ul class="space-y-1">
            <TocItems items={props.toc} activeId={activeId()} />
          </ul>
        </div>
      </nav>
    </Show>
  );
}
