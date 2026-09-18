import { Download } from "lucide-solid";
import { createSignal, For, onCleanup, Show } from "solid-js";

import {
  ImageCropCanvas,
  ImageCropProvider,
  type ImageCropResult,
  useImageCrop,
} from "@/registry/kobalte/blocks/image-crop";
import { Button } from "@/registry/kobalte/ui/button";
import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import { Label } from "@/registry/kobalte/ui/label";

type OutputType = "image/png" | "image/jpeg" | "image/webp";

const sampleImage = {
  name: "sunset.svg",
  src: `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="620" viewBox="0 0 1080 620">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbcfe8"/>
      <stop offset="1" stop-color="#fed7aa"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="620" fill="url(#bg)"/>
  <circle cx="540" cy="420" r="130" fill="#ea580c" opacity="0.65"/>
  <rect y="480" width="1080" height="140" fill="#7c2d12" opacity="0.35"/>
</svg>
`)}`,
  type: "image/svg+xml",
};

const outputTypes: { label: string; value: OutputType }[] = [
  { label: "PNG", value: "image/png" },
  { label: "JPEG", value: "image/jpeg" },
  { label: "WebP", value: "image/webp" },
];

export default function ImageCropOutput() {
  const [outputType, setOutputType] = createSignal<OutputType>("image/png");
  const [result, setResult] = createSignal<ImageCropResult | null>(null);

  const handleCrop = (nextResult: ImageCropResult) => {
    result()?.revoke();
    setResult(nextResult);
  };

  onCleanup(() => result()?.revoke());

  return (
    <ImageCropProvider
      defaultImage={sampleImage}
      onCrop={handleCrop}
      outputQuality={0.85}
      outputType={outputType()}
    >
      <div class="w-full max-w-2xl overflow-hidden rounded-xl border bg-background">
        <ImageCropCanvas class="min-h-80" />
        <OutputControls
          onOutputTypeChange={setOutputType}
          outputType={outputType}
          result={result}
        />
      </div>
    </ImageCropProvider>
  );
}

function OutputControls(props: {
  onOutputTypeChange: (value: OutputType) => void;
  outputType: () => OutputType;
  result: () => ImageCropResult | null;
}) {
  const crop = useImageCrop();

  return (
    <div class="space-y-4 border-t p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <For each={outputTypes}>
            {(type) => (
              <Button
                onClick={() => props.onOutputTypeChange(type.value)}
                size="sm"
                type="button"
                variant={props.outputType() === type.value ? "default" : "outline"}
              >
                {type.label}
              </Button>
            )}
          </For>
        </div>
        <div class="flex items-center gap-2">
          <Label for="image-crop-output-original">Original resolution</Label>
          <Checkbox
            checked={crop.options().original}
            id="image-crop-output-original"
            onChange={(checked) =>
              crop.setOptions((previous) => ({ ...previous, original: Boolean(checked) }))
            }
          />
        </div>
      </div>
      <div class="flex items-center justify-between gap-4">
        <Show
          when={props.result()}
          fallback={<p class="text-muted-foreground text-sm">No crop generated yet.</p>}
        >
          {(cropped) => (
            <p class="text-muted-foreground text-xs">
              {cropped().width} x {cropped().height} pixels, {cropped().blob.type},{" "}
              {Math.round(cropped().blob.size / 1024)} KB
            </p>
          )}
        </Show>
        <Button
          disabled={!crop.image() || crop.isCropping()}
          onClick={() => void crop.cropImage()}
          type="button"
        >
          <Download class="size-4" />
          {crop.isCropping() ? "Cropping..." : "Generate crop"}
        </Button>
      </div>
    </div>
  );
}
