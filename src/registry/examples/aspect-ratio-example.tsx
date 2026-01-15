/** biome-ignore-all lint/a11y/noRedundantAlt: <example file> */
import { Example, ExampleWrapper } from "@/components/example";
import { AspectRatio } from "@/registry/ui/aspect-ratio";

export default function AspectRatioExample() {
  return (
    <ExampleWrapper class="max-w-4xl 2xl:max-w-4xl">
      <AspectRatio16x9 />
      <AspectRatio21x9 />
      <AspectRatio1x1 />
      <AspectRatio9x16 />
    </ExampleWrapper>
  );
}

function AspectRatio16x9() {
  return (
    <Example title="16:9" class="items-center justify-center">
      <AspectRatio ratio={16 / 9} class="w-full rounded-lg bg-muted">
        <img
          src="https://avatar.vercel.sh/shadcn1"
          alt="Photo"
          class="h-full w-full rounded-lg object-cover grayscale dark:brightness-20"
        />
      </AspectRatio>
    </Example>
  );
}

function AspectRatio1x1() {
  return (
    <Example title="1:1" class="items-start">
      <AspectRatio ratio={1 / 1} class="w-full rounded-lg bg-muted">
        <img
          src="https://avatar.vercel.sh/shadcn1"
          alt="Photo"
          class="h-full w-full rounded-lg object-cover grayscale dark:brightness-20"
        />
      </AspectRatio>
    </Example>
  );
}

function AspectRatio9x16() {
  return (
    <Example title="9:16" class="items-center justify-center">
      <AspectRatio ratio={9 / 16} class="w-full rounded-lg bg-muted">
        <img
          src="https://avatar.vercel.sh/shadcn1"
          alt="Photo"
          class="h-full w-full rounded-lg object-cover grayscale dark:brightness-20"
        />
      </AspectRatio>
    </Example>
  );
}

function AspectRatio21x9() {
  return (
    <Example title="21:9" class="items-center justify-center">
      <AspectRatio ratio={21 / 9} class="w-full rounded-lg bg-muted">
        <img
          src="https://avatar.vercel.sh/shadcn1"
          alt="Photo"
          class="h-full w-full rounded-lg object-cover grayscale dark:brightness-20"
        />
      </AspectRatio>
    </Example>
  );
}
