import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-solid";
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
import { sharedComponents } from "@/components/mdx-components";
import { TableOfContents } from "@/components/toc";
import type { CanonicalDocsRouteData } from "@/lib/canonical-docs-route";
import {
  type DocsGroupId,
  ensureActiveDocsGroupOpen,
  getActiveDocsNavigationGroup,
  getDefaultDocsOpenGroups,
  readDocsOpenGroups,
  updateDocsGroupOpen,
  writeDocsOpenGroups,
} from "@/lib/docs-navigation";
import {
  type CanonicalNode,
  type CanonicalReadingEntry,
  DOCS_NAVIGATION_GROUPS,
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

function NavigationNode(props: { node: CanonicalNode; pathname: string; depth?: number }) {
  return (
    <li>
      <a
        data-active-docs-item={props.node.path === props.pathname ? "" : undefined}
        href={props.node.path}
        aria-current={props.node.path === props.pathname ? "page" : undefined}
        onClick={prepareNavigation}
        class={cn(
          "block rounded-md py-1.5 pr-2 text-muted-foreground text-sm outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground motion-reduce:transition-none",
          (props.depth ?? 0) > 0 ? "pl-6" : "pl-2",
        )}
      >
        {props.node.label}
      </a>
      <Show when={props.node.children?.length}>
        <ul class="mt-1 space-y-1 border-l pl-2">
          <For each={props.node.children}>
            {(child) => (
              <NavigationNode
                node={child}
                pathname={props.pathname}
                depth={(props.depth ?? 0) + 1}
              />
            )}
          </For>
        </ul>
      </Show>
    </li>
  );
}

function DocsNavigationRail(props: { pathname: string }) {
  const [openGroups, setOpenGroups] = createSignal(getDefaultDocsOpenGroups());
  let navigation: HTMLElement | undefined;

  const activeGroup = () => getActiveDocsNavigationGroup(props.pathname);

  const revealActiveItem = () =>
    navigation
      ?.querySelector<HTMLElement>("[data-active-docs-item]")
      ?.scrollIntoView({ block: "nearest" });

  const setGroupOpen = (id: DocsGroupId, open: boolean) => {
    const next = updateDocsGroupOpen(openGroups(), id, open, props.pathname);
    setOpenGroups(next);
    writeDocsOpenGroups(sessionStorage, next);
  };

  onMount(() => {
    setOpenGroups(readDocsOpenGroups(sessionStorage, props.pathname));
    requestAnimationFrame(revealActiveItem);
  });

  createEffect(
    on(
      () => props.pathname,
      () => {
        const next = ensureActiveDocsGroupOpen(openGroups(), props.pathname);
        if (next !== openGroups()) {
          setOpenGroups(next);
          writeDocsOpenGroups(sessionStorage, next);
        }
        requestAnimationFrame(revealActiveItem);
      },
      { defer: true },
    ),
  );

  return (
    <aside
      data-docs-left-rail
      class="sticky hidden self-start border-r lg:block"
      style={{
        top: "var(--product-header-height)",
        height: "calc(100svh - var(--product-header-height))",
      }}
    >
      <nav
        ref={navigation}
        aria-label="Docs hierarchy"
        class="no-scrollbar h-full overflow-y-auto px-4 py-8"
      >
        <For each={DOCS_NAVIGATION_GROUPS}>
          {(group) => {
            const isActive = () => activeGroup()?.id === group.id;
            const isOpen = () => isActive() || openGroups().has(group.id);
            const contentId = `docs-group-${group.id}`;
            return (
              <section class="mb-5 last:mb-0">
                <button
                  type="button"
                  aria-expanded={isOpen()}
                  aria-controls={contentId}
                  class="flex w-full items-center justify-between rounded-sm py-1 text-left font-medium text-xs uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    if (!isActive()) setGroupOpen(group.id, !isOpen());
                  }}
                >
                  {group.label}
                  <ChevronDown
                    class={cn("size-3.5 transition-transform motion-reduce:transition-none", {
                      "rotate-180": isOpen(),
                    })}
                  />
                </button>
                <Show when={isOpen()}>
                  <ul id={contentId} class="mt-2 space-y-1">
                    <For each={group.nodes}>
                      {(node) => <NavigationNode node={node} pathname={props.pathname} />}
                    </For>
                  </ul>
                </Show>
              </section>
            );
          }}
        </For>
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

export function CanonicalDocsPage(props: { node: CanonicalNode; entry: CanonicalReadingEntry }) {
  const readingToc = createMemo(() => getReadingToc(props.entry.toc));
  const mdxComponent = createMemo(() => authoredComponents[`../pages/${props.entry.source}.mdx`]);
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
      () => props.node.path,
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
        () => props.node.path,
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
      data-canonical-route={props.node.path}
      data-docs-shell
      class="mx-auto grid min-h-[calc(100svh-var(--product-header-height))] w-full max-w-[1520px] grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)]"
    >
      <DocsNavigationRail pathname={props.node.path} />
      <div class="grid min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <article class="mx-auto w-full max-w-[40rem] px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
          <header class="mb-8">
            <div class="flex items-start justify-between gap-4">
              <h1
                id="docs-page-heading"
                tabIndex={-1}
                class="scroll-mt-[calc(var(--product-header-height)+1rem)] font-heading font-semibold text-4xl tracking-tight outline-none"
              >
                {props.node.label}
              </h1>
              <PagePager pathname={props.node.path} position="heading" />
            </div>
            <Show when={props.entry.date}>
              {(date) => <p class="mt-2 text-muted-foreground text-sm">{fmtDate(date())}</p>}
            </Show>
            <p class="mt-4 text-lg text-muted-foreground leading-relaxed">
              {props.node.description}
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
              <div data-authored-docs-content data-authored-source={props.entry.source}>
                <Dynamic component={AuthoredContent()} components={sharedComponents} />
              </div>
            )}
          </Show>
          <OverviewCards pathname={props.node.path} />
          <PagePager pathname={props.node.path} position="footer" />
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

export function CanonicalDocsRouteView(props: { data: CanonicalDocsRouteData }) {
  return <CanonicalDocsPage node={props.data.node} entry={props.data.entry} />;
}
