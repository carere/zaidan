import { Image as ImageIcon, RefreshCcw } from "lucide-solid";
import { Show } from "solid-js";

import {
  ImageCropCanvas,
  ImageCropProvider,
  useImageCrop,
} from "@/registry/kobalte/blocks/image-crop";
import { Button } from "@/registry/kobalte/ui/button";

const sampleImage = {
  name: "sample.svg",
  src: `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="680" viewBox="0 0 1024 680">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a7f3d0"/>
      <stop offset="1" stop-color="#e0f2fe"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="680" fill="url(#bg)"/>
  <circle cx="260" cy="200" r="90" fill="#10b981" opacity="0.5"/>
  <rect x="520" y="240" width="320" height="220" rx="24" fill="#0f172a" opacity="0.2"/>
</svg>
`)}`,
  type: "image/svg+xml",
};

export default function ImageCropUpload() {
  return (
    <ImageCropProvider>
      <div class="w-full max-w-2xl overflow-hidden rounded-xl border bg-background">
        <UploadSurface />
      </div>
    </ImageCropProvider>
  );
}

function UploadSurface() {
  const crop = useImageCrop();
  let inputRef: HTMLInputElement | undefined;

  const handleFiles = (fileList: FileList | null) => {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    void crop.setImageFromFile(file);
  };

  return (
    <>
      <input
        ref={(element) => {
          inputRef = element;
        }}
        accept="image/png,image/jpeg,image/gif,image/webp"
        class="sr-only"
        onChange={(event) => {
          handleFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
        type="file"
      />
      <Show
        when={crop.image()}
        fallback={
          <div class="flex min-h-80 flex-col items-center justify-center gap-4 p-8 text-center">
            <p class="max-w-sm text-muted-foreground text-sm">
              Pick a file from your device or load the bundled sample image.
            </p>
            <div class="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => inputRef?.click()} type="button">
                <ImageIcon class="size-4" />
                Select image
              </Button>
              <Button
                onClick={() => void crop.setImageFromSource(sampleImage)}
                type="button"
                variant="secondary"
              >
                Use sample
              </Button>
            </div>
          </div>
        }
      >
        <ImageCropCanvas class="min-h-80" />
        <div class="flex items-center justify-between gap-4 border-t p-4">
          <p class="truncate text-muted-foreground text-sm">{crop.image()?.name}</p>
          <Button onClick={() => inputRef?.click()} size="sm" type="button" variant="outline">
            <RefreshCcw class="size-4" />
            Replace
          </Button>
        </div>
      </Show>
    </>
  );
}
