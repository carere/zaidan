import type { ImageCropImage, ImageCropInitialImage } from "./types";

function getImageDimensions(src: string) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ height: img.naturalHeight, width: img.naturalWidth });
    };
    img.onerror = () => reject(new Error("Unable to load image dimensions."));
    img.src = src;
  });
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image for cropping."));
    img.src = src;
  });
}

async function createImageFromFile(file: File): Promise<ImageCropImage> {
  const src = URL.createObjectURL(file);
  const dimensions = await getImageDimensions(src);

  return {
    ...dimensions,
    name: file.name || "image",
    revoke: () => URL.revokeObjectURL(src),
    src,
    type: file.type || "image/png",
  };
}

async function createImageFromSource(source: ImageCropInitialImage): Promise<ImageCropImage> {
  const dimensions = await getImageDimensions(source.src);

  return {
    ...dimensions,
    name: source.name ?? "image",
    src: source.src,
    type: source.type ?? "image/png",
  };
}

export { createImageFromFile, createImageFromSource, loadCanvasImage };
