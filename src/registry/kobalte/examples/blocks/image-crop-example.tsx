import { Crop, Download, Image as ImageIcon, RefreshCcw, RotateCcw, Upload } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import { createSignal, onCleanup, Show, splitProps } from "solid-js";

import kevinAvatarSrc from "@/assets/kevin.jpeg";
import { Example, ExampleWrapper } from "@/components/example";
import { cn } from "@/lib/utils";
import {
  ImageCropCanvas,
  type ImageCropInitialImage,
  type ImageCropOptions,
  ImageCropProvider,
  type ImageCropResult,
  useImageCrop,
} from "@/registry/kobalte/blocks/image-crop";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import { Checkbox } from "@/registry/kobalte/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/kobalte/ui/dialog";
import { Input } from "@/registry/kobalte/ui/input";
import { Label } from "@/registry/kobalte/ui/label";

type CropSource = ImageCropInitialImage & {
  revoke?: () => void;
};

type NumberOption = Exclude<keyof ImageCropOptions, "original">;

const demoAvatar = {
  name: "kevin.jpeg",
  src: kevinAvatarSrc,
  type: "image/jpeg",
} satisfies CropSource;

const demoLandscape = {
  name: "crop-demo.svg",
  src: `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="860" viewBox="0 0 1280 860">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#bae6fd"/>
      <stop offset="0.54" stop-color="#f0f9ff"/>
      <stop offset="1" stop-color="#fef3c7"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0f766e"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="860" fill="url(#sky)"/>
  <circle cx="1010" cy="178" r="94" fill="#f59e0b" opacity="0.78"/>
  <path d="M0 388C126 310 228 338 356 278C520 202 650 234 792 158C910 96 1084 88 1280 146V520H0Z" fill="#1e293b" opacity="0.14"/>
  <path d="M0 462C148 386 316 420 474 346C642 268 844 290 1016 226C1126 184 1202 182 1280 198V860H0Z" fill="#0f172a" opacity="0.22"/>
  <rect y="548" width="1280" height="312" fill="url(#water)"/>
  <path d="M92 624C240 582 388 660 536 616C712 564 872 650 1046 600C1140 574 1212 584 1280 616" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.5"/>
  <path d="M0 750C168 704 308 778 456 730C642 670 792 780 986 720C1098 686 1190 696 1280 734V860H0Z" fill="#0f172a" opacity="0.18"/>
  <rect x="278" y="274" width="256" height="174" rx="42" fill="#ffffff" opacity="0.76"/>
  <rect x="314" y="324" width="178" height="20" rx="10" fill="#64748b" opacity="0.35"/>
  <rect x="314" y="372" width="124" height="20" rx="10" fill="#64748b" opacity="0.24"/>
</svg>
`)}`,
  type: "image/svg+xml",
} satisfies CropSource;

export default function ImageCropExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1 2xl:grid-cols-1">
      <AvatarCropExample />
      <StudioCropExample />
    </ExampleWrapper>
  );
}

function AvatarCropExample() {
  const [avatarSrc, setAvatarSrc] = createSignal(demoAvatar.src);
  const [sourceImage, setSourceImage] = createSignal<CropSource>(demoAvatar);
  const [dialogImage, setDialogImage] = createSignal<CropSource>(demoAvatar);
  const [cropResult, setCropResult] = createSignal<ImageCropResult | null>(null);
  const [dialogOpen, setDialogOpen] = createSignal(false);

  const openCurrentCrop = () => {
    setDialogImage(sourceImage());
    setDialogOpen(true);
  };

  const cleanupDialogDraft = () => {
    const draft = dialogImage();

    if (draft !== sourceImage()) {
      draft.revoke?.();
      setDialogImage(sourceImage());
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      cleanupDialogDraft();
    }

    setDialogOpen(open);
  };

  const handleCrop = (result: ImageCropResult) => {
    const nextSource = dialogImage();

    cropResult()?.revoke();
    setCropResult(result);
    setAvatarSrc(result.url);
    setSourceImage((previous) => {
      if (previous !== nextSource) {
        previous.revoke?.();
      }

      return nextSource;
    });
    setDialogOpen(false);
  };

  onCleanup(() => {
    cropResult()?.revoke();
    sourceImage().revoke?.();
    cleanupDialogDraft();
  });

  return (
    <Example
      title="Avatar crop"
      class="items-center justify-center overflow-hidden p-0 sm:p-0"
      containerClass="max-w-4xl"
    >
      <div class="flex min-h-130 w-full items-center justify-center bg-muted/20 p-6 sm:p-10">
        <div class="relative flex items-center justify-center">
          <button
            aria-label="Crop profile avatar"
            class="group relative rounded-full outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={openCurrentCrop}
            type="button"
          >
            <Avatar class="size-36 overflow-hidden rounded-full after:rounded-full">
              <AvatarImage alt="Profile avatar" class="rounded-full" src={avatarSrc()} />
              <AvatarFallback class="rounded-full">CN</AvatarFallback>
            </Avatar>
          </button>
        </div>

        <Dialog open={dialogOpen()} onOpenChange={handleDialogOpenChange}>
          <Show when={dialogOpen()}>
            <DialogContent
              class="max-h-[calc(100vh-2rem)] max-w-[min(560px,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
              showCloseButton={false}
            >
              <DialogHeader class="sr-only">
                <DialogTitle>Crop avatar</DialogTitle>
                <DialogDescription>
                  Save a square crop for profile images and account menus.
                </DialogDescription>
              </DialogHeader>
              <ImageCropProvider defaultImage={dialogImage()} onCrop={handleCrop}>
                <div class="overflow-hidden bg-background" data-slot="image-crop">
                  <div class="p-6">
                    <ImageCropCanvas class="min-h-80 bg-background sm:min-h-115" />
                  </div>
                  <AvatarCropActions />
                </div>
              </ImageCropProvider>
            </DialogContent>
          </Show>
        </Dialog>
      </div>
    </Example>
  );
}

function AvatarCropActions() {
  const crop = useImageCrop();
  const disabled = () => !crop.image() || crop.isCropping();

  return (
    <DialogFooter class="border-t p-4 sm:justify-center">
      <DialogClose as={Button} type="button" variant="outline">
        Cancel
      </DialogClose>
      <Button disabled={disabled()} onClick={() => void crop.cropImage()} type="button">
        <Crop class="size-4" />
        {crop.isCropping() ? "Cropping..." : "Crop"}
      </Button>
    </DialogFooter>
  );
}

function StudioCropExample() {
  const [result, setResult] = createSignal<ImageCropResult | null>(null);

  const clearResult = () => {
    result()?.revoke();
    setResult(null);
  };

  onCleanup(clearResult);

  return (
    <Example
      title="Image cropper"
      class="items-stretch overflow-hidden p-0 sm:p-0"
      containerClass="max-w-5xl"
    >
      <ImageCropProvider
        aspectRatio={null}
        onCrop={(nextResult) => {
          result()?.revoke();
          setResult(nextResult);
        }}
      >
        <StudioCropSurface clearResult={clearResult} result={result} />
      </ImageCropProvider>
    </Example>
  );
}

function StudioCropSurface(props: {
  clearResult: () => void;
  result: () => ImageCropResult | null;
}) {
  const crop = useImageCrop();
  const [showResizeHandles, setShowResizeHandles] = createSignal(true);
  let inputRef: HTMLInputElement | undefined;

  const handleFiles = (fileList: FileList | null) => {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    props.clearResult();
    void crop.setImageFromFile(file);
  };

  const openFilePicker = () => inputRef?.click();

  const loadSampleImage = () => {
    props.clearResult();
    void crop.setImageFromSource(demoLandscape);
  };

  return (
    <div class="flex min-h-170 w-full min-w-0 flex-col overflow-hidden bg-background xl:flex-row">
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
      <div class="flex min-h-105 min-w-0 flex-1 items-center justify-center bg-muted/20">
        <Show
          when={crop.image()}
          fallback={
            <StudioUpload
              onBrowse={openFilePicker}
              onFiles={handleFiles}
              onUseSample={loadSampleImage}
            />
          }
        >
          <ImageCropCanvas
            class="min-h-130 bg-transparent"
            showResizeHandles={showResizeHandles()}
          />
        </Show>
      </div>
      <aside class="flex w-full shrink-0 flex-col gap-4 border-t bg-background p-4 xl:w-80 xl:border-t-0 xl:border-l">
        <StudioCropControls
          onShowResizeHandlesChange={setShowResizeHandles}
          showResizeHandles={showResizeHandles}
        />
        <StudioCropActions onBrowse={openFilePicker} result={props.result} />
      </aside>
    </div>
  );
}

function StudioUpload(
  props: ComponentProps<"section"> & {
    onBrowse: () => void;
    onFiles: (fileList: FileList | null) => void;
    onUseSample: () => void;
  },
) {
  const [local, others] = splitProps(props, ["class", "onBrowse", "onFiles", "onUseSample"]);
  const [isDragging, setIsDragging] = createSignal(false);

  return (
    <section
      aria-label="Image upload dropzone"
      class={cn(
        "m-6 flex min-h-105 w-full max-w-3xl flex-col items-center justify-center gap-5 border-2 border-border border-dashed bg-background p-8 text-center transition-colors",
        isDragging() && "border-primary bg-primary/5",
        local.class,
      )}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        local.onFiles(event.dataTransfer?.files ?? null);
      }}
      {...others}
    >
      <div class="flex size-14 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm">
        <Upload class="size-6" />
      </div>
      <div class="max-w-md space-y-1">
        <h3 class="font-medium text-base">Upload an image to start cropping</h3>
        <p class="text-muted-foreground text-sm">
          Drag and drop an image here, or select a file from your device.
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={local.onBrowse} type="button">
          <ImageIcon class="size-4" />
          Select image
        </Button>
        <Button onClick={local.onUseSample} type="button" variant="secondary">
          Use sample
        </Button>
      </div>
    </section>
  );
}

function StudioCropControls(props: {
  onShowResizeHandlesChange: (checked: boolean) => void;
  showResizeHandles: () => boolean;
}) {
  const crop = useImageCrop();
  const disabled = () => !crop.image();

  return (
    <Card
      data-disabled={disabled() ? "" : undefined}
      class={cn(disabled() && "pointer-events-none opacity-50")}
    >
      <CardHeader>
        <CardTitle>Crop options</CardTitle>
        <CardDescription>
          {crop.options().width} x {crop.options().height} crop from {crop.displaySize().width} x{" "}
          {crop.displaySize().height} preview pixels
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <StudioNumberField label="Width" optionKey="width" />
          <StudioNumberField label="Height" optionKey="height" />
          <StudioNumberField label="X" optionKey="x" />
          <StudioNumberField label="Y" optionKey="y" />
        </div>
        <div class="flex items-center justify-between gap-3 rounded-md border bg-muted/20 p-3">
          <Label class="min-w-0 flex-1 leading-snug" for="studio-crop-original">
            Crop original size
          </Label>
          <Checkbox
            checked={crop.options().original}
            disabled={disabled()}
            id="studio-crop-original"
            onChange={(checked) =>
              crop.setOptions((previous) => ({ ...previous, original: Boolean(checked) }))
            }
          />
        </div>
        <div class="flex items-center justify-between gap-3 rounded-md border bg-muted/20 p-3">
          <Label class="min-w-0 flex-1 leading-snug" for="studio-crop-handles">
            Show resize handles
          </Label>
          <Checkbox
            checked={props.showResizeHandles()}
            disabled={disabled()}
            id="studio-crop-handles"
            onChange={(checked) => props.onShowResizeHandlesChange(Boolean(checked))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StudioNumberField(props: { label: string; optionKey: NumberOption }) {
  const crop = useImageCrop();
  const inputId = () => `studio-crop-${props.optionKey}`;
  const updateOption = (value: number) => {
    const roundedValue = roundPixel(Number.isFinite(value) ? value : 0);

    crop.setOptions((previous) => {
      const next = { ...previous };
      const currentAspectRatio = crop.aspectRatio();

      if (currentAspectRatio && props.optionKey === "width") {
        next.width = roundedValue;
        next.height = roundDimension(roundedValue / currentAspectRatio);
      } else if (currentAspectRatio && props.optionKey === "height") {
        next.height = roundedValue;
        next.width = roundDimension(roundedValue * currentAspectRatio);
      } else if (props.optionKey === "width") {
        next.width = roundedValue;
      } else if (props.optionKey === "height") {
        next.height = roundedValue;
      } else {
        next[props.optionKey] = roundedValue;
      }

      return next;
    });
  };

  return (
    <div class="space-y-2">
      <Label for={inputId()}>{props.label}</Label>
      <Input
        disabled={!crop.image()}
        id={inputId()}
        inputMode="numeric"
        min={props.optionKey === "width" || props.optionKey === "height" ? 1 : 0}
        onInput={(event) => updateOption(event.currentTarget.valueAsNumber)}
        type="number"
        value={crop.options()[props.optionKey]}
      />
    </div>
  );
}

function StudioCropActions(props: { onBrowse: () => void; result: () => ImageCropResult | null }) {
  const crop = useImageCrop();
  const disabled = () => !crop.image() || crop.isCropping();

  const downloadCrop = async () => {
    const result = await crop.cropImage();

    if (!result) {
      return;
    }

    downloadBlobUrl(result.url, "cropped-image.png");
  };

  return (
    <div class="grid gap-2">
      <Button disabled={disabled()} onClick={() => void downloadCrop()} type="button">
        <Download class="size-4" />
        {crop.isCropping() ? "Cropping..." : "Download crop"}
      </Button>
      <div class="grid grid-cols-2 gap-2">
        <Button disabled={!crop.image()} onClick={crop.resetCrop} type="button" variant="secondary">
          <RotateCcw class="size-4" />
          Reset
        </Button>
        <Button disabled={!crop.image()} onClick={props.onBrowse} type="button" variant="secondary">
          <RefreshCcw class="size-4" />
          Replace
        </Button>
      </div>
      <Show when={props.result()}>
        {(result) => (
          <div class="mt-2 rounded-md border bg-muted/20 p-3">
            <img
              alt="Cropped preview"
              class="aspect-video w-full rounded-sm object-cover"
              src={result().url}
            />
            <p class="mt-2 text-muted-foreground text-xs">
              {result().width} x {result().height} output pixels
            </p>
          </div>
        )}
      </Show>
    </div>
  );
}

function roundPixel(value: number) {
  return Math.max(0, Math.round(value));
}

function roundDimension(value: number) {
  return Math.max(1, roundPixel(value));
}

function downloadBlobUrl(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
