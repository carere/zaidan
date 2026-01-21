import { cookieStorage, makePersisted, messageSync } from "@solid-primitives/storage";
import { type Accessor, createContext, createSignal, type ParentProps, useContext } from "solid-js";
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

type ViewProviderProps = ParentProps<{
  initialView?: View;
}>;

export const ViewProvider = (props: ViewProviderProps) => {
  const [view, setView] = makePersisted(createSignal<View>(props.initialView || "preview"), {
    name: "zaidan-view",
    storage: cookieStorage.withOptions({
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }),
    sync: messageSync(new BroadcastChannel("zaidan-view")),
  });

  const toggleView = () => {
    setView(view() === "preview" ? "docs" : "preview");
  };

  return (
    <ViewContext.Provider value={{ view, setView, toggleView }}>
      {props.children}
    </ViewContext.Provider>
  );
};
