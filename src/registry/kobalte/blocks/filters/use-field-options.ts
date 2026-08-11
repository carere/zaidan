import type { Accessor } from "solid-js";
import { createEffect, createSignal, on, onCleanup, untrack } from "solid-js";

import type { FilterFieldConfig, FilterOption, ResolvedFieldOptions } from "./types";

// Value->option cache shared across every component instance rendering the
// SAME field object (the Add Filter submenu and the active-filter chip both
// receive the same config reference from the fields map). Keyed by the field
// object so it is shared when fields are memoized and garbage-collected
// otherwise. This keeps a value selected in the submenu labelled in the chip.
const fieldOptionCaches = new WeakMap<object, Map<unknown, FilterOption>>();

const getFieldOptionCache = <T = unknown>(field: FilterFieldConfig<T>): Map<T, FilterOption<T>> => {
  let cache = fieldOptionCaches.get(field as object);
  if (!cache) {
    cache = new Map();
    fieldOptionCaches.set(field as object, cache);
  }
  return cache as unknown as Map<T, FilterOption<T>>;
};

/**
 * Resolves a field's options for a popover/submenu. Static fields return their
 * list verbatim (unchanged legacy behavior). Async fields (`loadOptions`)
 * debounce the query, guard against out-of-order responses, and expose
 * loading/error state plus a value->label cache.
 */
const createFieldOptions = <T = unknown>(
  field: Accessor<FilterFieldConfig<T>>,
  searchInput: Accessor<string>,
  enabled: Accessor<boolean>,
): ResolvedFieldOptions<T> => {
  const isAsync = () => typeof field().loadOptions === "function";

  // Seed the shared cache from any static options an async field also provides
  // (static fields never read this cache, so skip the work for them).
  createEffect(() => {
    const current = field();
    if (typeof current.loadOptions !== "function" || !current.options) return;
    const cache = getFieldOptionCache(current);
    for (const option of current.options) {
      cache.set(option.value, option);
    }
  });

  const [asyncOptions, setAsyncOptions] = createSignal<FilterOption<T>[]>(
    untrack(field).options ?? [],
  );
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(false);

  // Debounce the query for async fields to avoid a request per keystroke.
  const [debouncedQuery, setDebouncedQuery] = createSignal(untrack(searchInput));
  createEffect(() => {
    const query = searchInput();
    if (!isAsync()) return;
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    onCleanup(() => clearTimeout(timer));
  });

  let requestId = 0;
  // Only the debounced query and the enabled flag retrigger a load. The field
  // itself is read untracked so an inline (unmemoized) config object does not
  // cancel and refire the in-flight request on every parent update.
  createEffect(
    on([debouncedQuery, enabled], ([query, isEnabled]) => {
      const current = untrack(field);
      const loader = current.loadOptions;
      if (!loader || !isEnabled) return;

      const currentRequestId = ++requestId;
      let cancelled = false;
      setLoading(true);
      setError(false);

      Promise.resolve()
        .then(() => loader(query))
        .then((result) => {
          // Ignore stale responses (out-of-order guard).
          if (cancelled || currentRequestId !== requestId) return;
          const cache = getFieldOptionCache(current);
          for (const option of result) cache.set(option.value, option);
          setAsyncOptions(result);
          setLoading(false);
          setError(false);
        })
        .catch(() => {
          if (cancelled || currentRequestId !== requestId) return;
          setLoading(false);
          setError(true);
        });

      onCleanup(() => {
        cancelled = true;
      });
    }),
  );

  const resolveSelected = (values: T[]): FilterOption<T>[] => {
    const cache = getFieldOptionCache(untrack(field));
    return values.map((value) => cache.get(value) ?? { value, label: String(value) });
  };

  return {
    isAsync,
    options: () => (isAsync() ? asyncOptions() : (field().options ?? [])),
    loading: () => isAsync() && loading(),
    error: () => isAsync() && error(),
    resolveSelected,
  };
};

export { createFieldOptions, getFieldOptionCache };
