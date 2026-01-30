import { type Accessor, createContext, createSignal, type ParentProps, untrack } from "solid-js";

export type ColorMode = "light" | "dark";

export type ColorModeContextValue = {
  colorMode: Accessor<ColorMode>;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
};

export const ColorModeContext = createContext<ColorModeContextValue>();

export function ColorModeProvider(
  props: ParentProps<{
    initialColorMode: ColorMode;
  }>,
) {
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
    <ColorModeContext.Provider value={{ colorMode, toggleColorMode, setColorMode }}>
      {props.children}
    </ColorModeContext.Provider>
  );
}
