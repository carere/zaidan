import { cookieStorage, makePersisted, messageSync } from "@solid-primitives/storage";
import {
  type Accessor,
  createContext,
  createEffect,
  createSignal,
  type ParentProps,
  useContext,
} from "solid-js";
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

const STYLE_CLASSES = ["style-vega", "style-nova", "style-lyra", "style-maia", "style-mira"];

export const StyleProvider = (props: StyleProviderProps) => {
  const [style, setStyle] = makePersisted(createSignal<Style>(props.initialStyle || "vega"), {
    name: "zaidan-style",
    storage: cookieStorage.withOptions({
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }),
    sync: messageSync(new BroadcastChannel("zaidan-style")),
  });

  // Update body class when style changes
  createEffect(() => {
    const currentStyle = style();
    if (typeof document !== "undefined") {
      // Remove all style classes from body
      document.body.classList.remove(...STYLE_CLASSES);
      // Add the current style class
      document.body.classList.add(`style-${currentStyle}`);
    }
  });

  return (
    <StyleContext.Provider value={{ style, setStyle }}>{props.children}</StyleContext.Provider>
  );
};
