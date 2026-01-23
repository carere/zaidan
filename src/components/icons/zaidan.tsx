import type { ComponentProps } from "solid-js";

export function Zaidan(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 206 181" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>Zaidan</title>
      <path d="M205.24 0H0V180.27H205.24V0Z" class="fill-primary dark:fill-transparent" />
      <path d="M193.24 11.35H12.3199V60.31H193.24V11.35Z" fill="white" />
      <path d="M193.24 117.05H87.0599L131.64 72.63H193.24V117.05Z" fill="#7071BB" />
      <path d="M12.3199 117.05V171.09L114.13 72.63H12.3199V117.05Z" fill="white" />
    </svg>
  );
}
