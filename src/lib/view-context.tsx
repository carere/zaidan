import {
  type Accessor,
  createContext,
  createSignal,
  type ParentComponent,
  useContext,
} from "solid-js";
import type { View } from "@/lib/types";

type ViewContextProps = {
  view: Accessor<View>;
  setView: (view: View) => void;
  toggleView: () => void;
};

const ViewContext = createContext<ViewContextProps | null>(null);

export function useView() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error("useView must be used within a ViewProvider.");
  }
  return context;
}

export const ViewProvider: ParentComponent = (props) => {
  const [view, setView] = createSignal<View>("preview");

  const toggleView = () => {
    setView(view() === "preview" ? "docs" : "preview");
  };

  return (
    <ViewContext.Provider value={{ view, setView, toggleView }}>
      {props.children}
    </ViewContext.Provider>
  );
};
