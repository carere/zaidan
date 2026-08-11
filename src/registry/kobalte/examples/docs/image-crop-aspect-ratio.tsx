import { createSignal, For } from "solid-js";

import {
  ImageCropCanvas,
  ImageCropProvider,
  useImageCrop,
} from "@/registry/kobalte/blocks/image-crop";
import { Button } from "@/registry/kobalte/ui/button";

const sampleImage = {
  name: "landscape.svg",
  src: `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="720" viewBox="0 0 1080 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c7d2fe"/>
      <stop offset="1" stop-color="#fce7f3"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="720" fill="url(#bg)"/>
  <circle cx="820" cy="170" r="80" fill="#f97316" opacity="0.75"/>
  <path d="M0 470C180 390 360 450 540 380C740 306 900 360 1080 300V720H0Z" fill="#1e1b4b" opacity="0.3"/>
</svg>
`)}`,
  type: "image/svg+xml",
};

const ratios = [
  { label: "Square", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "Free", value: null },
] as const;

export default function ImageCropAspectRatio() {
  const [aspectRatio, setAspectRatio] = createSignal<number | null>(1);

  return (
    <ImageCropProvider aspectRatio={aspectRatio()} defaultImage={sampleImage}>
      <div class="w-full max-w-2xl overflow-hidden rounded-xl border bg-background">
        <ImageCropCanvas class="min-h-80" />
        <RatioControls aspectRatio={aspectRatio} onAspectRatioChange={setAspectRatio} />
      </div>
    </ImageCropProvider>
  );
}

function RatioControls(props: {
  aspectRatio: () => number | null;
  onAspectRatioChange: (value: number | null) => void;
}) {
  const crop = useImageCrop();

  const selectRatio = (value: number | null) => {
    props.onAspectRatioChange(value);
    crop.resetCrop();
  };

  return (
    <div class="flex flex-wrap items-center gap-2 border-t p-4">
      <For each={ratios}>
        {(ratio) => (
          <Button
            onClick={() => selectRatio(ratio.value)}
            size="sm"
            type="button"
            variant={props.aspectRatio() === ratio.value ? "default" : "outline"}
          >
            {ratio.label}
          </Button>
        )}
      </For>
    </div>
  );
}
