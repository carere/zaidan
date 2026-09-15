import type { Accessor, ComponentProps } from "solid-js";

type ImageCropImage = {
  height: number;
  name: string;
  src: string;
  type: string;
  width: number;
  revoke?: () => void;
};

type ImageCropInitialImage = {
  name?: string;
  src: string;
  type?: string;
};

type ImageCropOptions = {
  height: number;
  original: boolean;
  width: number;
  x: number;
  y: number;
};

type ImageCropResult = {
  blob: Blob;
  dataUrl: string;
  height: number;
  options: ImageCropOptions;
  revoke: () => void;
  url: string;
  width: number;
};

type ImageCropContextValue = {
  aspectRatio: Accessor<number | null>;
  cropImage: () => Promise<ImageCropResult | null>;
  displaySize: Accessor<{ height: number; width: number }>;
  image: Accessor<ImageCropImage | null>;
  isCropping: Accessor<boolean>;
  options: Accessor<ImageCropOptions>;
  resetCrop: () => void;
  setImageFromFile: (file: File) => Promise<void>;
  setImageFromSource: (source: ImageCropInitialImage) => Promise<void>;
  setOptions: (
    value: ImageCropOptions | ((previous: ImageCropOptions) => ImageCropOptions),
  ) => void;
  setViewportSize: (size: { height: number; width: number }) => void;
};

type ImageCropCanvasProps = ComponentProps<"div"> & {
  showResizeHandles?: boolean;
};

type ResizeHandleDirection = "e" | "n" | "ne" | "nw" | "s" | "se" | "sw" | "w";

type ImageCropProviderProps = {
  aspectRatio?: number | null;
  defaultImage?: ImageCropInitialImage;
  onCrop?: (result: ImageCropResult) => void;
  outputQuality?: number;
  outputType?: "image/jpeg" | "image/png" | "image/webp";
};

export type {
  ImageCropCanvasProps,
  ImageCropContextValue,
  ImageCropImage,
  ImageCropInitialImage,
  ImageCropOptions,
  ImageCropProviderProps,
  ImageCropResult,
  ResizeHandleDirection,
};
