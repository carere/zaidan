import { type ComponentProps, splitProps } from "solid-js";

export function Kobalte(props: ComponentProps<"svg">) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <svg viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" class={local.class} {...others}>
      <title>Kobalte</title>
      <path d="M1.49414 18V3.68359H4.38477V10.041L10.2246 3.68359H14.1113L8.7207 9.25977L14.4043 18H10.6641L6.72852 11.2812L4.38477 13.6738V18H1.49414Z" />
      <path d="M20 18C21.6569 18 23 16.6569 23 15C23 13.3431 21.6569 12 20 12C18.3431 12 17 13.3431 17 15C17 16.6569 18.3431 18 20 18Z" />
    </svg>
  );
}
