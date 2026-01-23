import { type ComponentProps, splitProps } from "solid-js";

export function Radius(props: ComponentProps<"svg">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class={local.class} {...others}>
      <title>Radius</title>
      <path
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 20v-5C4 8.925 8.925 4 15 4h5"
      />
    </svg>
  );
}
``;
