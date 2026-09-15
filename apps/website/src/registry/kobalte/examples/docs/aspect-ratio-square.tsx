import { AspectRatio } from "@/registry/kobalte/ui/aspect-ratio";

export default function AspectRatioSquare() {
  return (
    <AspectRatio ratio={1 / 1} class="w-full max-w-[12rem] rounded-lg bg-muted">
      <img
        src="https://avatar.vercel.sh/shadcn1"
        alt="Abstract avatar"
        class="absolute inset-0 size-full rounded-lg object-cover grayscale dark:brightness-20"
      />
    </AspectRatio>
  );
}
