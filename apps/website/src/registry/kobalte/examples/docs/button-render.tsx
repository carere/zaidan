import { buttonVariants } from "@/registry/kobalte/ui/button";

export default function ButtonRender() {
  return (
    <a href="/login" class={buttonVariants({ variant: "secondary", size: "sm" })}>
      Login
    </a>
  );
}
