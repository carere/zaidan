import { createContext, useContext } from "solid-js";

import type { ImageCropContextValue } from "./types";

const ImageCropContext = createContext<ImageCropContextValue | null>(null);

function useImageCropContext() {
  const context = useContext(ImageCropContext);

  if (!context) {
    throw new Error("useImageCrop must be used within an ImageCropProvider.");
  }

  return context;
}

function useImageCrop(): Omit<ImageCropContextValue, "setViewportSize"> {
  const { setViewportSize: _setViewportSize, ...context } = useImageCropContext();

  return context;
}

export { ImageCropContext, useImageCrop, useImageCropContext };
