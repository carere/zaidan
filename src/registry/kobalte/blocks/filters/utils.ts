import { cva } from "class-variance-authority";

import type {
  Filter,
  FilterFieldConfig,
  FilterFieldGroup,
  FilterFieldsConfig,
  FilterGroup,
} from "./types";

// Container variant for filters wrapper
const filtersContainerVariants = cva("flex flex-wrap items-center", {
  variants: {
    variant: {
      solid: "gap-2",
      default: "",
    },
    size: {
      sm: "gap-1.5",
      default: "gap-2.5",
      lg: "gap-3.5",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

// Helper functions to handle both flat and grouped field configurations
const isFieldGroup = <T = unknown>(
  item: FilterFieldConfig<T> | FilterFieldGroup<T>,
): item is FilterFieldGroup<T> => {
  return "fields" in item && Array.isArray(item.fields);
};

// Helper function to check if a FilterFieldConfig is a group-level configuration
const isGroupLevelField = <T = unknown>(field: FilterFieldConfig<T>): boolean => {
  return Boolean(field.group && field.fields);
};

const flattenFields = <T = unknown>(fields: FilterFieldsConfig<T>): FilterFieldConfig<T>[] => {
  const flat: FilterFieldConfig<T>[] = [];
  for (const item of fields) {
    if (isFieldGroup(item)) {
      flat.push(...item.fields);
      continue;
    }
    // Handle group-level fields (new structure)
    if (isGroupLevelField(item)) {
      flat.push(...(item.fields as FilterFieldConfig<T>[]));
      continue;
    }
    flat.push(item);
  }
  return flat;
};

const getFieldsMap = <T = unknown>(
  fields: FilterFieldsConfig<T>,
): Record<string, FilterFieldConfig<T>> => {
  const flatFields = flattenFields(fields);
  return flatFields.reduce(
    (acc, field) => {
      // Only add fields that have a key (skip group-level configurations)
      if (field.key) {
        acc[field.key] = field;
      }
      return acc;
    },
    {} as Record<string, FilterFieldConfig<T>>,
  );
};

// Whether a field exposes any option source (a static list or an async loader).
// IMPORTANT: never gate on `field.options?.length` once `loadOptions` exists —
// a function's `.length` is its arity, not an option count, which silently
// breaks the submenu gate for async fields.
const fieldHasOptions = <T = unknown>(field: FilterFieldConfig<T>): boolean =>
  (field.options?.length ?? 0) > 0 || typeof field.loadOptions === "function";

const createFilter = <T = unknown>(
  field: string,
  operator?: string,
  values: T[] = [],
): Filter<T> => ({
  id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  field,
  operator: operator || "is",
  values,
});

const createFilterGroup = <T = unknown>(
  id: string,
  label: string,
  fields: FilterFieldConfig<T>[],
  initialFilters: Filter<T>[] = [],
): FilterGroup<T> => ({
  id,
  label,
  filters: initialFilters,
  fields,
});

export {
  createFilter,
  createFilterGroup,
  fieldHasOptions,
  filtersContainerVariants,
  flattenFields,
  getFieldsMap,
  isFieldGroup,
  isGroupLevelField,
};
