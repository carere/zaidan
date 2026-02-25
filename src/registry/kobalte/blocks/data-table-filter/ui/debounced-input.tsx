import { createEffect, createSignal, on, splitProps } from "solid-js";
import { Input } from "@/registry/kobalte/ui/input";
import { debounce } from "../lib/debounce";

type DebouncedInputProps = {
  value: string | number;
  onChange: (value: string | number) => void;
  debounceMs?: number;
  id?: string;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
  class?: string;
};

export function DebouncedInput(props: DebouncedInputProps) {
  const [local, others] = splitProps(props, ["value", "onChange", "debounceMs"]);
  const [value, setValue] = createSignal(local.value);

  createEffect(
    on(
      () => local.value,
      (v) => setValue(v),
    ),
  );

  const debouncedOnChange = debounce((newValue: string | number) => {
    local.onChange(newValue);
  }, local.debounceMs ?? 500);

  const handleInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    const newValue = e.currentTarget.value;
    setValue(newValue);
    debouncedOnChange(newValue);
  };

  return <Input {...others} value={value()} onInput={handleInput} />;
}
