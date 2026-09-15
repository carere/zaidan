import { AspectRatio } from "@/registry/kobalte/ui/aspect-ratio";

export default function AspectRatioDemo() {
  return (
    <AspectRatio ratio={16 / 9} class="w-full max-w-sm rounded-lg bg-muted">
      <img
        src="https://avatar.vercel.sh/shadcn1"
        alt="Abstract avatar"
        class="absolute inset-0 size-full rounded-lg object-cover grayscale dark:brightness-20"
      />
    </AspectRatio>
  );
}
