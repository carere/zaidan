import { type ComponentProps, splitProps } from "solid-js";

export function Maia(props: ComponentProps<"svg">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      class={local.class}
      {...others}
    >
      <title>Maia</title>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      ></circle>
    </svg>
  );
}
