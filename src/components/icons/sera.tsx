import { type ComponentProps, splitProps } from "solid-js";

export function Sera(props: ComponentProps<"svg">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      class={local.class}
      {...others}
    >
      <title>Sera</title>
      <rect x="3" y="3" width="18" height="18" stroke="currentColor" stroke-width="2" />
    </svg>
  );
}
