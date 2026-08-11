import { AspectRatio } from "@/registry/kobalte/ui/aspect-ratio";

export default function AspectRatioPortrait() {
  return (
    <AspectRatio ratio={9 / 16} class="w-full max-w-[10rem] rounded-lg bg-muted">
      <img
        src="https://avatar.vercel.sh/shadcn1"
        alt="Abstract avatar"
        class="absolute inset-0 size-full rounded-lg object-cover grayscale dark:brightness-20"
      />
    </AspectRatio>
  );
}
