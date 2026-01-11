import { type Accessor, createContext, createSignal, type ParentProps, useContext } from "solid-js";
import type { Style } from "@/lib/types";

type StyleContextProps = {
  style: Accessor<Style>;
  setStyle: (style: Style) => void;
};

const StyleContext = createContext<StyleContextProps | null>(null);

export function useStyle() {
  const context = useContext(StyleContext);
  if (!context) {
    throw new Error("useStyle must be used within a StyleProvider.");
  }
  return context;
}

type StyleProviderProps = ParentProps<{
  initialStyle?: Style;
}>;

export const StyleProvider = (props: StyleProviderProps) => {
  const [style, setStyle] = createSignal<Style>(props.initialStyle || "vega");

  return (
    <StyleContext.Provider value={{ style, setStyle }}>{props.children}</StyleContext.Provider>
  );
};
