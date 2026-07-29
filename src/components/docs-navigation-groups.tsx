import { ChevronDown } from "lucide-solid";
import { createEffect, createSignal, For, type JSX, on, onMount, Show } from "solid-js";
import {
  type DocsGroupId,
  getActiveDocsNavigationGroup,
  getDefaultDocsOpenGroups,
  readDocsOpenGroups,
  updateDocsGroupOpen,
  writeDocsOpenGroups,
} from "@/lib/docs-navigation";
import { type CanonicalNode, DOCS_NAVIGATION_GROUPS } from "@/lib/product-routing";
import { cn } from "@/lib/utils";

type DocsNavigationGroupsProps = {
  pathname: string;
  revealWhenVisible?: boolean;
  variant: "rail" | "mobile";
  idPrefix: string;
  class?: string;
  groupClass?: string;
  triggerClass?: string;
  nodesClass?: string;
  nestedNodesClass?: string;
  renderLink: (node: CanonicalNode, depth: number) => JSX.Element;
};

function DocsNavigationNode(props: {
  node: CanonicalNode;
  depth: number;
  nestedNodesClass?: string;
  renderLink: DocsNavigationGroupsProps["renderLink"];
}) {
  return (
    <li>
      {props.renderLink(props.node, props.depth)}
      <Show when={props.node.children?.length}>
        <ul class={props.nestedNodesClass}>
          <For each={props.node.children}>
            {(child) => (
              <DocsNavigationNode
                node={child}
                depth={props.depth + 1}
                nestedNodesClass={props.nestedNodesClass}
                renderLink={props.renderLink}
              />
            )}
          </For>
        </ul>
      </Show>
    </li>
  );
}

export function DocsNavigationGroups(props: DocsNavigationGroupsProps) {
  const [openGroups, setOpenGroups] = createSignal(getDefaultDocsOpenGroups());
  let root: HTMLUListElement | undefined;

  const isVisible = () => props.revealWhenVisible ?? true;
  const activeGroup = () => getActiveDocsNavigationGroup(props.pathname);
  const revealActiveItem = () =>
    root?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  const scheduleActiveItemReveal = () =>
    requestAnimationFrame(() => requestAnimationFrame(revealActiveItem));

  const restoreAndReveal = () => {
    setOpenGroups(readDocsOpenGroups(sessionStorage, props.pathname));
    scheduleActiveItemReveal();
  };

  const setGroupOpen = (id: DocsGroupId, open: boolean) => {
    const next = updateDocsGroupOpen(openGroups(), id, open, props.pathname);
    setOpenGroups(next);
    writeDocsOpenGroups(sessionStorage, next);
  };

  onMount(() => {
    if (isVisible()) restoreAndReveal();
  });

  createEffect(
    on(
      [() => props.pathname, isVisible],
      ([, visible]) => {
        if (visible) restoreAndReveal();
      },
      { defer: true },
    ),
  );

  return (
    <ul ref={root} data-docs-navigation-groups={props.variant} class={props.class}>
      <For each={DOCS_NAVIGATION_GROUPS}>
        {(group) => {
          const isActive = () => activeGroup()?.id === group.id;
          const isOpen = () => isActive() || openGroups().has(group.id);
          const contentId = `${props.idPrefix}-${group.id}`;
          return (
            <li class={props.groupClass}>
              <button
                type="button"
                data-docs-mobile-group={props.variant === "mobile" ? "" : undefined}
                aria-expanded={isOpen()}
                aria-controls={contentId}
                class={props.triggerClass}
                onClick={() => setGroupOpen(group.id, !isOpen())}
              >
                {group.label}
                <ChevronDown
                  class={cn("size-3.5 transition-transform motion-reduce:transition-none", {
                    "rotate-180": isOpen(),
                  })}
                />
              </button>
              <Show when={isOpen()}>
                <ul id={contentId} class={props.nodesClass}>
                  <For each={group.nodes}>
                    {(node) => (
                      <DocsNavigationNode
                        node={node}
                        depth={0}
                        nestedNodesClass={props.nestedNodesClass}
                        renderLink={props.renderLink}
                      />
                    )}
                  </For>
                </ul>
              </Show>
            </li>
          );
        }}
      </For>
    </ul>
  );
}
