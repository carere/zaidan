import { LoaderIcon } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type SpinnerProps = ComponentProps<"svg">;

const Spinner = (props: SpinnerProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      class={cn("size-4 animate-spin", local.class)}
      {...others}
    />
  );
};

export default function SpinnerCustom() {
  return (
    <div class="flex items-center gap-4">
      <Spinner />
    </div>
  );
}
