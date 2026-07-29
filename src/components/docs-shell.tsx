import { ChevronLeft, ChevronRight } from "lucide-solid";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  lazy,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { DocsNavigationGroups } from "@/components/docs-navigation-groups";
import { sharedComponents } from "@/components/mdx-components";
import { TableOfContents } from "@/components/toc";
import type { CanonicalDocsRouteData } from "@/lib/canonical-docs-route";
import {
  getCanonicalOverviewChildren,
  getCanonicalReadingEntry,
  getCanonicalTraversal,
  getReadingToc,
} from "@/lib/product-routing";
import type { MdxModule } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";

const FOCUS_DESTINATION_KEY = "zaidan:product-navigation-focus";

const authoredModules = import.meta.glob<MdxModule>([
  "../pages/docs/**/*.mdx",
  "../pages/changelog/*.mdx",
]);
const authoredComponents: Record<string, MdxModule["default"]> = {};
for (const [path, loadModule] of Object.entries(authoredModules)) {
  authoredComponents[path] = lazy(loadModule);
}

const prepareNavigation = (event: MouseEvent) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  sessionStorage.setItem(FOCUS_DESTINATION_KEY, "heading");
};

const focusPageHeading = () => {
  const destination = sessionStorage.getItem(FOCUS_DESTINATION_KEY);
  if (!destination) return;
  sessionStorage.removeItem(FOCUS_DESTINATION_KEY);
  requestAnimationFrame(() => {
    const heading = document.getElementById("docs-page-heading");
    if (!heading) return;
    heading.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  });
};

function DocsNavigationRail(props: { pathname: string }) {
  return (
    <aside
      data-docs-left-rail
      class="sticky hidden self-start border-r lg:block"
      style={{
        top: "var(--product-header-height)",
        height: "calc(100svh - var(--product-header-height))",
      }}
    >
      <nav aria-label="Docs hierarchy" class="no-scrollbar h-full overflow-y-auto px-4 py-8">
        <DocsNavigationGroups
          pathname={props.pathname}
          variant="rail"
          idPrefix="docs-group"
          groupClass="mb-5 last:mb-0"
          triggerClass="flex w-full items-center justify-between rounded-sm py-1 text-left font-medium text-xs uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-ring"
          nodesClass="mt-2 space-y-1"
          nestedNodesClass="mt-1 space-y-1 border-l pl-2"
          renderLink={(node, depth) => (
            <a
              data-active-docs-item={node.path === props.pathname ? "" : undefined}
              href={node.path}
              aria-current={node.path === props.pathname ? "page" : undefined}
              onClick={prepareNavigation}
              class={cn(
                "block rounded-md py-1.5 pr-2 text-muted-foreground text-sm outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground motion-reduce:transition-none",
                depth > 0 ? "pl-6" : "pl-2",
              )}
            >
              {node.label}
            </a>
          )}
        />
      </nav>
    </aside>
  );
}

function OverviewCards(props: { pathname: string }) {
  const children = createMemo(() => getCanonicalOverviewChildren(props.pathname));

  return (
    <Show when={children()}>
      {(items) => (
        <section aria-label="Browse this category" class="mt-10 grid gap-3 sm:grid-cols-2">
          <For each={items()}>
            {(item) => {
              const readingEntry = () => getCanonicalReadingEntry(item.path);
              return (
                <a
                  href={item.path}
                  onClick={prepareNavigation}
                  class="group rounded-xl border p-5 no-underline outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  <span class="flex items-center justify-between gap-3 font-medium">
                    {item.label}
                    <ChevronRight class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                  <Show when={readingEntry()?.date}>
                    {(date) => (
                      <span class="mt-1 block text-muted-foreground text-xs">
                        {fmtDate(date())}
                      </span>
                    )}
                  </Show>
                  <Show when={item.description}>
                    <span class="mt-2 block text-muted-foreground text-sm leading-relaxed">
                      {item.description}
                    </span>
                  </Show>
                </a>
              );
            }}
          </For>
        </section>
      )}
    </Show>
  );
}

function PagePager(props: { pathname: string; position: "heading" | "footer" }) {
  const traversal = createMemo(() => getCanonicalTraversal(props.pathname));
  const compact = () => props.position === "heading";

  return (
    <nav
      aria-label={compact() ? "Adjacent Docs pages" : "Previous and next Docs pages"}
      class={cn("flex gap-2", {
        "shrink-0": compact(),
        "mt-14 hidden border-t pt-6 sm:grid sm:grid-cols-2": !compact(),
      })}
    >
      <Show when={traversal()?.previous}>
        {(previous) => (
          <a
            href={previous().path}
            onClick={prepareNavigation}
            aria-label={compact() ? `Previous: ${previous().label}` : undefined}
            class={cn(
              "rounded-md border text-sm no-underline outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              compact()
                ? "grid size-9 place-items-center"
                : "flex min-h-20 flex-col items-start justify-center px-4",
            )}
          >
            <Show
              when={compact()}
              fallback={
                <>
                  <span class="text-muted-foreground text-xs">Previous</span>
                  <span class="mt-1 font-medium">{previous().label}</span>
                </>
              }
            >
              <ChevronLeft />
            </Show>
          </a>
        )}
      </Show>
      <Show when={traversal()?.next}>
        {(next) => (
          <a
            href={next().path}
            onClick={prepareNavigation}
            aria-label={compact() ? `Next: ${next().label}` : undefined}
            class={cn(
              "rounded-md border text-sm no-underline outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              compact()
                ? "grid size-9 place-items-center"
                : "flex min-h-20 flex-col items-end justify-center px-4 text-right sm:col-start-2",
            )}
          >
            <Show
              when={compact()}
              fallback={
                <>
                  <span class="text-muted-foreground text-xs">Next</span>
                  <span class="mt-1 font-medium">{next().label}</span>
                </>
              }
            >
              <ChevronRight />
            </Show>
          </a>
        )}
      </Show>
    </nav>
  );
}

export function CanonicalDocsPage(props: { data: CanonicalDocsRouteData }) {
  const readingToc = createMemo(() => getReadingToc(props.data.entry.toc));
  const mdxComponent = createMemo(
    () => authoredComponents[`../pages/${props.data.entry.source}.mdx`],
  );
  const [activeTocUrl, setActiveTocUrl] = createSignal("");
  let mobileToc: HTMLDetailsElement | undefined;

  const selectToc = (url: string) => {
    const target = document.getElementById(url.replace(/^#/, ""));
    if (!target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.history.pushState(window.history.state, "", url);
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    setActiveTocUrl(url);
    mobileToc?.removeAttribute("open");
  };

  createEffect(
    on(
      () => props.data.node.path,
      () => {
        focusPageHeading();
        setActiveTocUrl(window.location.hash);
      },
    ),
  );

  onMount(() => {
    let intersectionObserver: IntersectionObserver | undefined;
    let mutationObserver: MutationObserver | undefined;
    const observeHeadings = () => {
      intersectionObserver?.disconnect();
      const headings = readingToc().flatMap((item) => [item, ...item.items]);
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .toSorted((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
          if (visible[0]?.target.id) setActiveTocUrl(`#${visible[0].target.id}`);
        },
        { rootMargin: "-15% 0px -70% 0px" },
      );
      for (const item of headings) {
        const heading = document.getElementById(item.url.replace(/^#/, ""));
        if (heading) intersectionObserver.observe(heading);
      }
    };
    createEffect(
      on(
        () => props.data.node.path,
        () => {
          mutationObserver?.disconnect();
          requestAnimationFrame(() => {
            const content = document.querySelector("[data-authored-docs-content]");
            if (content) {
              mutationObserver = new MutationObserver(observeHeadings);
              mutationObserver.observe(content, { childList: true, subtree: true });
            }
            observeHeadings();
          });
        },
      ),
    );
    onCleanup(() => {
      intersectionObserver?.disconnect();
      mutationObserver?.disconnect();
    });
  });

  return (
    <main
      data-product-surface="docs"
      data-canonical-route={props.data.node.path}
      data-docs-shell
      class="mx-auto grid min-h-[calc(100svh-var(--product-header-height))] w-full max-w-[1520px] grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)]"
    >
      <DocsNavigationRail pathname={props.data.node.path} />
      <div class="grid min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <article class="mx-auto w-full max-w-[40rem] px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
          <header class="mb-8">
            <div class="flex items-start justify-between gap-4">
              <h1
                id="docs-page-heading"
                tabIndex={-1}
                class="scroll-mt-[calc(var(--product-header-height)+1rem)] font-heading font-semibold text-4xl tracking-tight outline-none"
              >
                {props.data.node.label}
              </h1>
              <PagePager pathname={props.data.node.path} position="heading" />
            </div>
            <Show when={props.data.entry.date}>
              {(date) => <p class="mt-2 text-muted-foreground text-sm">{fmtDate(date())}</p>}
            </Show>
            <p class="mt-4 text-lg text-muted-foreground leading-relaxed">
              {props.data.node.description}
            </p>
          </header>

          <Show when={readingToc().length > 0}>
            <details ref={mobileToc} data-mobile-toc class="mb-8 rounded-lg border p-4 xl:hidden">
              <summary class="cursor-pointer font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
                On this page
              </summary>
              <TableOfContents
                class="mt-4"
                toc={readingToc()}
                activeUrl={activeTocUrl()}
                onSelect={selectToc}
                hideTitle
              />
            </details>
          </Show>

          <Show when={mdxComponent()}>
            {(AuthoredContent) => (
              <div data-authored-docs-content data-authored-source={props.data.entry.source}>
                <Dynamic component={AuthoredContent()} components={sharedComponents} />
              </div>
            )}
          </Show>
          <OverviewCards pathname={props.data.node.path} />
          <PagePager pathname={props.data.node.path} position="footer" />
        </article>

        <Show when={readingToc().length > 0}>
          <aside
            data-docs-right-toc
            class="sticky hidden self-start px-5 py-12 xl:block"
            style={{ top: "var(--product-header-height)" }}
          >
            <TableOfContents toc={readingToc()} activeUrl={activeTocUrl()} onSelect={selectToc} />
          </aside>
        </Show>
      </div>
    </main>
  );
}
