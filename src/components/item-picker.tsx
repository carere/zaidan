import { splitProps } from "solid-js";
import { Input, type InputProps } from "@/registry/ui/input";

export function ItemPicker(props: InputProps) {
  const [local, others] = splitProps(props as InputProps, ["class"]);

  return <Input type="text" placeholder="Home" class={local.class} {...others} />;
}
