import { useContext } from "solid-js";
import {
  ColorModeContext,
  type ColorModeContextValue,
} from "@/registry/kobalte/components/color-mode-provider";

export function useColorMode(): ColorModeContextValue {
  const context = useContext(ColorModeContext);
  if (context === undefined) {
    throw new Error("useColorMode must be used within a ColorModeProvider");
  }
  return context;
}
