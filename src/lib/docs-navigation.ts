import {
  type CanonicalNavigationGroup,
  type CanonicalNode,
  DOCS_NAVIGATION_GROUPS,
} from "@/lib/product-routing";

export const DOCS_GROUP_STATE_KEY = "zaidan:docs-navigation-groups";
export type DocsGroupId = CanonicalNavigationGroup["id"];

const DOCS_GROUP_IDS = new Set<DocsGroupId>(DOCS_NAVIGATION_GROUPS.map(({ id }) => id));

export const canonicalNodeContainsPath = (node: CanonicalNode, pathname: string): boolean =>
  node.path === pathname ||
  Boolean(node.children?.some((child) => canonicalNodeContainsPath(child, pathname)));

export const getActiveDocsNavigationGroup = (pathname: string) =>
  DOCS_NAVIGATION_GROUPS.find((group) =>
    group.nodes.some((node) => canonicalNodeContainsPath(node, pathname)),
  );

export const getDefaultDocsOpenGroups = () =>
  new Set<DocsGroupId>(DOCS_NAVIGATION_GROUPS.map(({ id }) => id));

export const parseDocsOpenGroups = (value: string | null): Set<DocsGroupId> | undefined => {
  if (value === null) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    const parsedIds = new Set(
      parsed.filter(
        (candidate): candidate is DocsGroupId =>
          typeof candidate === "string" && DOCS_GROUP_IDS.has(candidate as DocsGroupId),
      ),
    );
    return new Set(DOCS_NAVIGATION_GROUPS.map(({ id }) => id).filter((id) => parsedIds.has(id)));
  } catch {
    return undefined;
  }
};

export const ensureActiveDocsGroupOpen = (groups: Set<DocsGroupId>, pathname: string) => {
  const activeGroup = getActiveDocsNavigationGroup(pathname);
  if (!activeGroup || groups.has(activeGroup.id)) return groups;
  return new Set([...groups, activeGroup.id]);
};

export const serializeDocsOpenGroups = (groups: Set<DocsGroupId>) =>
  JSON.stringify(DOCS_NAVIGATION_GROUPS.map(({ id }) => id).filter((id) => groups.has(id)));

type DocsGroupStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export const readDocsOpenGroups = (storage: DocsGroupStorage, pathname: string) => {
  const stored = storage.getItem(DOCS_GROUP_STATE_KEY);
  const parsed = parseDocsOpenGroups(stored);
  if (stored !== null && !parsed) storage.removeItem(DOCS_GROUP_STATE_KEY);
  return ensureActiveDocsGroupOpen(parsed ?? getDefaultDocsOpenGroups(), pathname);
};

export const writeDocsOpenGroups = (storage: DocsGroupStorage, groups: Set<DocsGroupId>) => {
  storage.setItem(DOCS_GROUP_STATE_KEY, serializeDocsOpenGroups(groups));
};

export const updateDocsGroupOpen = (
  groups: Set<DocsGroupId>,
  id: DocsGroupId,
  open: boolean,
  pathname: string,
) => {
  if (!open && getActiveDocsNavigationGroup(pathname)?.id === id) return groups;
  const next = new Set(groups);
  if (open) next.add(id);
  else next.delete(id);
  return next;
};
