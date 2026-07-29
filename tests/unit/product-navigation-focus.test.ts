import { describe, expect, it, vi } from "vitest";
import { consumeProductNavigationFocus } from "@/lib/product-navigation-focus";

const storedValue = (value: string | null) => {
  const removeItem = vi.fn();
  return {
    storage: {
      getItem: () => value,
      removeItem,
    },
    removeItem,
  };
};

describe("Product navigation focus handoff", () => {
  it.each([
    ["heading", "heading"],
    ["#quick-start", "#quick-start"],
    [null, undefined],
    ["", undefined],
    ["main h1", undefined],
    ["#", undefined],
  ])("validates the stored destination %j", (stored, expected) => {
    const { storage, removeItem } = storedValue(stored);

    expect(consumeProductNavigationFocus(storage)).toBe(expected);
    expect(removeItem).toHaveBeenCalledTimes(stored === null ? 0 : 1);
  });
});
