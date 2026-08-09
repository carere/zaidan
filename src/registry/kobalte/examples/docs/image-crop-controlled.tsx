import { RotateCcw } from "lucide-solid";

import {
  ImageCropCanvas,
  ImageCropProvider,
  useImageCrop,
} from "@/registry/kobalte/blocks/image-crop";
import { Button } from "@/registry/kobalte/ui/button";

const sampleImage = {
  name: "grid.svg",
  src: `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fde68a"/>
      <stop offset="1" stop-color="#fca5a5"/>
    </linearGradient>
  </defs>
  <rect width="960" height="640" fill="url(#bg)"/>
  <circle cx="480" cy="320" r="120" fill="#7c2d12" opacity="0.3"/>
  <rect x="120" y="120" width="200" height="140" rx="20" fill="#7c2d12" opacity="0.2"/>
  <rect x="640" y="380" width="200" height="140" rx="20" fill="#7c2d12" opacity="0.2"/>
</svg>
`)}`,
  type: "image/svg+xml",
};

export default function ImageCropControlled() {
  return (
    <ImageCropProvider defaultImage={sampleImage}>
      <div class="w-full max-w-2xl overflow-hidden rounded-xl border bg-background">
        <ImageCropCanvas class="min-h-80" />
        <GeometryControls />
      </div>
    </ImageCropProvider>
  );
}

function GeometryControls() {
  const crop = useImageCrop();

  const nudge = (deltaX: number, deltaY: number) => {
    crop.setOptions((previous) => ({
      ...previous,
      x: previous.x + deltaX,
      y: previous.y + deltaY,
    }));
  };

  const center = () => {
    crop.setOptions((previous) => ({
      ...previous,
      x: Math.floor((crop.displaySize().width - previous.width) / 2),
      y: Math.floor((crop.displaySize().height - previous.height) / 2),
    }));
  };

  return (
    <div class="flex flex-wrap items-center justify-between gap-3 border-t p-4">
      <p class="font-mono text-muted-foreground text-xs">
        {crop.options().width} x {crop.options().height} at ({crop.options().x}, {crop.options().y})
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <Button onClick={() => nudge(-20, 0)} size="sm" type="button" variant="outline">
          Left
        </Button>
        <Button onClick={() => nudge(20, 0)} size="sm" type="button" variant="outline">
          Right
        </Button>
        <Button onClick={center} size="sm" type="button" variant="outline">
          Center
        </Button>
        <Button onClick={crop.resetCrop} size="sm" type="button" variant="secondary">
          <RotateCcw class="size-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
