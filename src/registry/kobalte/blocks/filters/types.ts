import type { ComponentProps, JSX, ValidComponent } from "solid-js";

// i18n configuration interface
type FilterI18nConfig = {
  // UI Labels
  addFilter: string;
  searchFields: string;
  noFieldsFound: string;
  noResultsFound: string;
  select: string;
  true: string;
  false: string;
  min: string;
  max: string;
  to: string;
  typeAndPressEnter: string;
  selected: string;
  selectedCount: string;
  percent: string;
  defaultCurrency: string;
  defaultColor: string;
  addFilterTitle: string;
  // Async option loading states (optional; fall back to sensible defaults)
  loadingOptions?: string;
  errorLoadingOptions?: string;

  // Operators
  operators: {
    is: string;
    isNot: string;
    isAnyOf: string;
    isNotAnyOf: string;
    includesAll: string;
    excludesAll: string;
    before: string;
    after: string;
    between: string;
    notBetween: string;
    contains: string;
    notContains: string;
    startsWith: string;
    endsWith: string;
    isExactly: string;
    equals: string;
    notEquals: string;
    greaterThan: string;
    lessThan: string;
    overlaps: string;
    includes: string;
    excludes: string;
    includesAllOf: string;
    includesAnyOf: string;
    empty: string;
    notEmpty: string;
  };

  // Placeholders
  placeholders: {
    enterField: (fieldType: string) => string;
    selectField: string;
    searchField: (fieldName: string) => string;
    enterKey: string;
    enterValue: string;
  };

  // Helper functions
  helpers: {
    formatOperator: (operator: string) => string;
  };

  // Validation
  validation: {
    invalidEmail: string;
    invalidUrl: string;
    invalidTel: string;
    invalid: string;
  };
};

// Solid evaluates JSX eagerly, so `icon: <Mail />` inside a config object is
// created while the config is built — before it is ever inserted. During
// hydration that consumes a hydration key for a node the server never wrote
// into the HTML, and the next polymorphic element fails with
// "Hydration Mismatch". Passing a thunk (`icon: () => <Mail />`) defers
// creation to insert time; Solid resolves function children on insert, so both
// forms render identically. Prefer the thunk in any SSR/hydrated app.
type FilterIcon = JSX.Element | (() => JSX.Element);

type FilterVariant = "solid" | "default";
type FilterSize = "sm" | "default" | "lg";
type FilterRadius = "default" | "full";

// Context for all Filter component props
type FilterContextValue = {
  variant: FilterVariant;
  size: FilterSize;
  radius: FilterRadius;
  i18n: FilterI18nConfig;
  class?: string;
  showSearchInput?: boolean;
  trigger?: ValidComponent;
  allowMultiple?: boolean;
};

// Generic types for flexible filter system
type FilterOption<T = unknown> = {
  value: T;
  label: string;
  icon?: FilterIcon;
  metadata?: Record<string, unknown>;
  class?: string;
};

type FilterOperator = {
  value: string;
  label: string;
  supportsMultiple?: boolean;
};

// Custom renderer props interface
type CustomRendererProps<T = unknown> = {
  field: FilterFieldConfig<T>;
  values: T[];
  onChange: (values: T[]) => void;
  operator: string;
};

// Props passed to a field's `renderOptionList` slot. Lets a consumer render the
// options list however they like (e.g. windowing / virtualization with a
// library of their choice) while staying bound to the primitive's selection and
// keyboard behavior.
type FilterOptionListRenderProps<T = unknown> = {
  // Options to render: already resolved, query-filtered, and selected-first.
  options: FilterOption<T>[];
  // Index into `options` of the keyboard-highlighted row (-1 if none). A
  // virtualized implementation should scroll this row into view and keep it
  // mounted so the combobox's aria-activedescendant stays valid.
  highlightedIndex: number;
  // Renders one option row with the correct id, selection state, highlight, and
  // toggle handler wired to the primitive. Call it for each row you render.
  renderOption: (option: FilterOption<T>, index: number) => JSX.Element;
};

// Grouped field configuration interface
type FilterFieldGroup<T = unknown> = {
  group?: string;
  fields: FilterFieldConfig<T>[];
};

// Union type for both flat and grouped field configurations
type FilterFieldsConfig<T = unknown> = FilterFieldConfig<T>[] | FilterFieldGroup<T>[];

type FilterFieldConfig<T = unknown> = {
  key?: string;
  label?: string;
  icon?: FilterIcon;
  type?: "select" | "multiselect" | "text" | "custom" | "separator";
  // Group-level configuration
  group?: string;
  fields?: FilterFieldConfig<T>[];
  // Field-specific options
  options?: FilterOption<T>[];
  // Async / large-list options loader. Receives the current search query and
  // may return a Promise. Use it to prefetch a remote list once (ignore the
  // query) or to run server-side search (filter by the query). When both
  // `options` and `loadOptions` are provided, `options` seeds the initial view
  // and the value->label cache while `loadOptions` supplies live results.
  loadOptions?: (query: string) => FilterOption<T>[] | Promise<FilterOption<T>[]>;
  // Bring-your-own rendering for the options list (e.g. virtualization with a
  // windowing library of your choice). Return the full scrollable list, call
  // `renderOption` for each row, and scroll `highlightedIndex` into view. When
  // omitted, the options render as a plain scrollable list.
  renderOptionList?: (props: FilterOptionListRenderProps<T>) => JSX.Element;
  operators?: FilterOperator[];
  customRenderer?: (props: CustomRendererProps<T>) => JSX.Element;
  customValueRenderer?: (values: T[], options: FilterOption<T>[]) => JSX.Element;
  placeholder?: string;
  searchable?: boolean;
  maxSelections?: number;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string | JSX.Element;
  suffix?: string | JSX.Element;
  pattern?: string;
  validation?: (value: unknown) => boolean | { valid: boolean; message?: string };
  allowCustomValues?: boolean;
  class?: string;
  menuPopupClassName?: string;
  // Grouping options (legacy support)
  groupLabel?: string;
  // Boolean field options
  onLabel?: string;
  offLabel?: string;
  // Input event handlers
  onInputChange?: JSX.EventHandler<HTMLInputElement, InputEvent>;
  // Default operator to use when creating a filter for this field
  defaultOperator?: string;
  // Controlled values support for this field
  value?: T[];
  onValueChange?: (values: T[]) => void;
};

type Filter<T = unknown> = {
  id: string;
  field: string;
  operator: string;
  values: T[];
};

type FilterGroup<T = unknown> = {
  id: string;
  label?: string;
  filters: Filter<T>[];
  fields: FilterFieldConfig<T>[];
};

type ResolvedFieldOptions<T = unknown> = {
  isAsync: () => boolean;
  options: () => FilterOption<T>[];
  loading: () => boolean;
  error: () => boolean;
  // Resolve selected values to full options using an accumulating value->option
  // cache, so async/controlled selections keep their label and icon even when
  // absent from the latest result page.
  resolveSelected: (values: T[]) => FilterOption<T>[];
};

type FilterInputProps<T = unknown> = Omit<ComponentProps<"input">, "onBlur" | "onKeyDown"> & {
  field?: FilterFieldConfig<T>;
  onBlur?: JSX.EventHandler<HTMLInputElement, FocusEvent>;
  onKeyDown?: JSX.EventHandler<HTMLInputElement, KeyboardEvent>;
};

type FilterRemoveButtonProps = Omit<ComponentProps<"button">, "type"> & {
  icon?: JSX.Element;
};

type FilterOperatorDropdownProps<T = unknown> = {
  field: FilterFieldConfig<T>;
  operator: string;
  values: T[];
  onChange: (operator: string) => void;
};

type FilterValueSelectorProps<T = unknown> = {
  field: FilterFieldConfig<T>;
  values: T[];
  onChange: (values: T[]) => void;
  operator: string;
  autofocus?: boolean;
};

type SelectOptionsPopoverProps<T = unknown> = {
  field: FilterFieldConfig<T>;
  values: T[];
  onChange: (values: T[]) => void;
  onClose?: () => void;
  inline?: boolean;
};

type FilterSubmenuContentProps<T = unknown> = {
  field: FilterFieldConfig<T>;
  currentValues: T[];
  isMultiSelect: boolean;
  onToggle: (value: T, isSelected: boolean) => void;
  i18n: FilterI18nConfig;
  isActive?: boolean;
  onActive?: () => void;
  onBack?: () => void;
  onClose?: () => void;
};

type FiltersContentProps<T = unknown> = {
  filters: Filter<T>[];
  fields: FilterFieldsConfig<T>;
  onChange: (filters: Filter<T>[]) => void;
};

type FiltersProps<T = unknown> = {
  filters: Filter<T>[];
  fields: FilterFieldsConfig<T>;
  onChange: (filters: Filter<T>[]) => void;
  class?: string;
  variant?: FilterVariant;
  size?: FilterSize;
  radius?: FilterRadius;
  i18n?: Partial<FilterI18nConfig>;
  showSearchInput?: boolean;
  // Solid has no `cloneElement`: the trigger is a component rendered through
  // Kobalte's polymorphic `as`, not a pre-built element like upstream's
  // `render` prop.
  trigger?: ValidComponent;
  allowMultiple?: boolean;
  menuPopupClassName?: string;
  collapseAddButton?: boolean;
  enableShortcut?: boolean;
  shortcutKey?: string;
  shortcutLabel?: string;
};

export type {
  CustomRendererProps,
  Filter,
  FilterContextValue,
  FilterFieldConfig,
  FilterFieldGroup,
  FilterFieldsConfig,
  FilterGroup,
  FilterI18nConfig,
  FilterIcon,
  FilterInputProps,
  FilterOperator,
  FilterOperatorDropdownProps,
  FilterOption,
  FilterOptionListRenderProps,
  FilterRadius,
  FilterRemoveButtonProps,
  FilterSize,
  FilterSubmenuContentProps,
  FiltersContentProps,
  FiltersProps,
  FilterValueSelectorProps,
  FilterVariant,
  ResolvedFieldOptions,
  SelectOptionsPopoverProps,
};
