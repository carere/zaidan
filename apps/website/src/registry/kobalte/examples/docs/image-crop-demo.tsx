import { Crop } from "lucide-solid";
import { createSignal, onCleanup, Show } from "solid-js";

import {
  ImageCropCanvas,
  ImageCropProvider,
  type ImageCropResult,
  useImageCrop,
} from "@/registry/kobalte/blocks/image-crop";
import { Button } from "@/registry/kobalte/ui/button";

const sampleImage = {
  name: "portrait.svg",
  src: `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#bae6fd"/>
      <stop offset="1" stop-color="#fef3c7"/>
    </linearGradient>
  </defs>
  <rect width="960" height="640" fill="url(#bg)"/>
  <circle cx="700" cy="150" r="70" fill="#f59e0b" opacity="0.8"/>
  <path d="M0 420C160 340 320 400 480 340C660 272 800 320 960 260V640H0Z" fill="#0f172a" opacity="0.25"/>
  <path d="M0 500C200 440 380 500 560 450C740 400 860 440 960 410V640H0Z" fill="#0f172a" opacity="0.35"/>
</svg>
`)}`,
  type: "image/svg+xml",
};

export default function ImageCropDemo() {
  const [result, setResult] = createSignal<ImageCropResult | null>(null);

  const handleCrop = (nextResult: ImageCropResult) => {
    result()?.revoke();
    setResult(nextResult);
  };

  onCleanup(() => result()?.revoke());

  return (
    <ImageCropProvider defaultImage={sampleImage} onCrop={handleCrop}>
      <div class="w-full max-w-2xl overflow-hidden rounded-xl border bg-background">
        <ImageCropCanvas class="min-h-80" />
        <div class="flex items-center justify-between gap-4 border-t p-4">
          <Show
            when={result()}
            fallback={
              <p class="text-muted-foreground text-sm">Drag, resize, then save a square crop.</p>
            }
          >
            {(cropped) => (
              <div class="flex items-center gap-3">
                <img
                  alt="Cropped preview"
                  class="size-12 rounded-full border object-cover"
                  src={cropped().url}
                />
                <p class="text-muted-foreground text-xs">
                  {cropped().width} x {cropped().height} output pixels
                </p>
              </div>
            )}
          </Show>
          <CropButton />
        </div>
      </div>
    </ImageCropProvider>
  );
}

function CropButton() {
  const crop = useImageCrop();

  return (
    <Button
      disabled={!crop.image() || crop.isCropping()}
      onClick={() => void crop.cropImage()}
      type="button"
    >
      <Crop class="size-4" />
      {crop.isCropping() ? "Cropping..." : "Crop"}
    </Button>
  );
}
