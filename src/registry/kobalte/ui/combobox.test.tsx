// @vitest-environment happy-dom
import { createSignal, For } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, expect, it } from "vitest";
import ComboboxMultiple from "@/registry/kobalte/examples/docs/combobox-multiple";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxInput,
  ComboboxValue,
} from "./combobox";

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  document.body.replaceChildren();
});

it("shows the multiple documentation demo's default selection in the control", () => {
  dispose = render(() => <ComboboxMultiple />, document.body);
  expect(document.querySelector('[data-slot="combobox-chips"]')?.textContent).toContain("Next.js");
});

it("keeps chips while typing and selecting, then removes only the requested option", async () => {
  dispose = render(() => <ComboboxMultiple />, document.body);
  const input = inputElement();
  input.focus();
  input.value = "Astro";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(document.querySelector('[data-slot="combobox-chips"]')?.textContent).toContain("Next.js");
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(chips()).toEqual(["Next.js", "Astro"]);
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  expect(chips()).toEqual(["Next.js", "Astro"]);
  button("Remove Next.js").click();
  expect(chips()).toEqual(["Astro"]);
  button("Remove Astro").click();
  expect(chips()).toEqual([]);
  expect(document.activeElement).toBe(input);
  input.value = "Remix";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  expect(input.value).toBe("Remix");
});

function inputElement() {
  const input = document.querySelector("input");
  if (!input) throw new Error("Missing combobox input");
  return input;
}

function chips() {
  return [...document.querySelectorAll('[data-slot="combobox-chip"]')].map(
    (chip) => chip.textContent,
  );
}
function button(name: string) {
  const result = document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
  if (!result) throw new Error(`Missing button: ${name}`);
  return result;
}

const options = [
  { id: "next", label: "Next.js" },
  { id: "astro", label: "Astro" },
];

it.each(["property", "function"])(
  "reflects controlled object selection and removal using a %s label accessor",
  (kind) => {
    const [value, setValue] = createSignal([options[0]]);
    dispose = render(
      () => (
        <Combobox
          multiple
          options={options}
          optionValue="id"
          optionTextValue={kind === "property" ? "label" : (option) => option.label}
          value={value()}
          onChange={setValue}
        >
          <ComboboxInput showClear />
        </Combobox>
      ),
      document.body,
    );
    expect(chips()).toEqual(["Next.js"]);
    setValue(options);
    expect(chips()).toEqual(["Next.js", "Astro"]);
    button("Remove Next.js").click();
    expect(value()).toEqual([options[1]]);
    expect(chips()).toEqual(["Astro"]);
    button("Clear selection").click();
    expect(value()).toEqual([]);
    expect(chips()).toEqual([]);
  },
);

it.each(["root", "input"])(
  "retains disabled selections and blocks removal when disabled on the %s",
  (level) => {
    const [value, setValue] = createSignal(["Next.js"]);
    dispose = render(
      () => (
        <Combobox
          multiple
          options={["Next.js"]}
          value={value()}
          onChange={setValue}
          disabled={level === "root"}
        >
          <ComboboxInput disabled={level === "input"} showClear />
        </Combobox>
      ),
      document.body,
    );
    expect(chips()).toEqual(["Next.js"]);
    expect(button("Remove Next.js").disabled).toBe(true);
    button("Remove Next.js").click();
    expect(button("Clear selection").disabled).toBe(true);
    button("Clear selection").click();
    expect(value()).toEqual(["Next.js"]);
  },
);

it("preserves invalid state and normal backspace removal", () => {
  dispose = render(
    () => (
      <Combobox
        multiple
        options={["Next.js", "Astro"]}
        defaultValue={["Next.js", "Astro"]}
        validationState="invalid"
      >
        <ComboboxInput />
      </Combobox>
    ),
    document.body,
  );
  const input = inputElement();
  expect(input.getAttribute("aria-invalid")).toBe("true");
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
  expect(chips()).toEqual(["Next.js"]);
});

it("preserves single selection text and the clear button", () => {
  dispose = render(
    () => (
      <Combobox options={["Next.js", "Astro"]} defaultValue="Next.js">
        <ComboboxInput showClear />
      </Combobox>
    ),
    document.body,
  );
  const input = inputElement();
  expect(input.value).toBe("Next.js");
  expect(chips()).toEqual([]);
  button("Clear selection").click();
  expect(input.value).toBe("");
  expect(document.querySelector('[aria-label="Clear selection"]')).toBeNull();
});

it("composes shadcn-style chip parts with Kobalte selection and custom chip content", () => {
  const [value, setValue] = createSignal(options);
  dispose = render(
    () => (
      <Combobox
        multiple
        options={options}
        optionValue="id"
        optionTextValue="label"
        value={value()}
        onChange={setValue}
      >
        <ComboboxChips>
          <ComboboxValue<(typeof options)[number]>>
            {(values) => (
              <For each={values}>
                {(option) => (
                  <ComboboxChip value={option}>
                    <strong>{option.label}</strong>
                  </ComboboxChip>
                )}
              </For>
            )}
          </ComboboxValue>
          <ComboboxChipsInput placeholder="Add framework" />
        </ComboboxChips>
      </Combobox>
    ),
    document.body,
  );
  expect(chips()).toEqual(["Next.js", "Astro"]);
  button("Remove Next.js").click();
  expect(value()).toEqual([options[1]]);
  expect(chips()).toEqual(["Astro"]);
  setValue([]);
  expect(chips()).toEqual([]);
  expect(inputElement().placeholder).toBe("Add framework");
});

it("keeps composed chips visible and disabled, with optional remove buttons", () => {
  const [disabled, setDisabled] = createSignal(true);
  const [showRemove, setShowRemove] = createSignal(true);
  const [value, setValue] = createSignal(["Next.js"]);
  dispose = render(
    () => (
      <Combobox
        multiple
        options={["Next.js"]}
        value={value()}
        onChange={setValue}
        disabled={disabled()}
        validationState="invalid"
      >
        <ComboboxChips>
          <ComboboxValue<string>>
            {(values) => (
              <For each={values}>
                {(option) => <ComboboxChip value={option} showRemove={showRemove()} />}
              </For>
            )}
          </ComboboxValue>
          <ComboboxChipsInput />
        </ComboboxChips>
      </Combobox>
    ),
    document.body,
  );
  expect(chips()).toEqual(["Next.js"]);
  expect(inputElement().disabled).toBe(true);
  expect(inputElement().getAttribute("aria-invalid")).toBe("true");
  expect(button("Remove Next.js").disabled).toBe(true);
  button("Remove Next.js").click();
  expect(value()).toEqual(["Next.js"]);
  setDisabled(false);
  setShowRemove(false);
  expect(chips()).toEqual(["Next.js"]);
  expect(document.querySelector('[aria-label="Remove Next.js"]')).toBeNull();
  setShowRemove(true);
  button("Remove Next.js").click();
  expect(value()).toEqual([]);
});
