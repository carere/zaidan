import { type ComponentProps, createEffect, createSignal, splitProps } from "solid-js";
import { Input } from "@/registry/kobalte/ui/input";
import { debounce } from "../lib/debounce";

type DebouncedInputProps = Omit<ComponentProps<"input">, "onChange"> & {
  value: string | number;
  onChange: (value: string | number) => void;
  debounceMs?: number;
};

export function DebouncedInput(props: DebouncedInputProps) {
  const [local, others] = splitProps(props, ["value", "onChange", "debounceMs"]);
  const [value, setValue] = createSignal(local.value);

  createEffect(() => {
    setValue(() => local.value);
  });

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
