import {
  type Accessor,
  createContext,
  createSignal,
  type ParentProps,
  untrack,
  useContext,
} from "solid-js";

export type ColorMode = "light" | "dark";

interface ColorModeContextValue {
  colorMode: Accessor<ColorMode>;
  toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue | undefined>();

interface ColorModeProviderProps extends ParentProps {
  initialColorMode: ColorMode;
}

export function ColorModeProvider(props: ColorModeProviderProps) {
  const [colorMode, setColorMode] = createSignal<ColorMode>(props.initialColorMode);

  const toggleColorMode = () => {
    setColorMode((prev) => (prev === "dark" ? "light" : "dark"));

    // Update the HTML element class
    const html = document.documentElement;
    html.classList.remove("light", "dark");
    html.classList.add(untrack(colorMode));

    // Set the cookie
    // biome-ignore lint/suspicious/noDocumentCookie: <will find a better way to do this>
    document.cookie = `zaidan-color-mode=${untrack(colorMode)}; path=/; max-age=31536000; SameSite=Lax`;
  };

  return (
    <ColorModeContext.Provider value={{ colorMode, toggleColorMode }}>
      {props.children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeContextValue {
  const context = useContext(ColorModeContext);
  if (context === undefined) {
    throw new Error("useColorMode must be used within a ColorModeProvider");
  }
  return context;
}
