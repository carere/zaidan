import { createContext, useContext } from "solid-js";

import { DEFAULT_I18N } from "./i18n";
import type { FilterContextValue } from "./types";

const FilterContext = createContext<FilterContextValue>({
  variant: "default",
  size: "default",
  radius: "default",
  i18n: DEFAULT_I18N,
  class: undefined,
  showSearchInput: true,
  trigger: undefined,
  allowMultiple: true,
});

const useFilterContext = () => useContext(FilterContext);

export { FilterContext, useFilterContext };
