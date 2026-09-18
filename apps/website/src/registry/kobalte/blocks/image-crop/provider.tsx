import type { ParentProps } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
  splitProps,
  untrack,
} from "solid-js";

import { DEFAULT_ASPECT_RATIO } from "./constants";
import { ImageCropContext } from "./context";
import {
  calculateScaleFactor,
  clampCropOptions,
  defaultOptions,
  getAspectRatio,
  getDefaultOptions,
  getDisplaySize,
  getFallbackViewportSize,
} from "./geometry";
import { createImageFromFile, createImageFromSource, loadCanvasImage } from "./image-utils";
import type {
  ImageCropImage,
  ImageCropInitialImage,
  ImageCropOptions,
  ImageCropProviderProps,
  ImageCropResult,
} from "./types";

function ImageCropProvider(props: ParentProps<ImageCropProviderProps>) {
  const mergedProps = mergeProps(
    {
      aspectRatio: DEFAULT_ASPECT_RATIO,
      outputQuality: 0.92,
      outputType: "image/png" as const,
    },
    props,
  );
  const [local] = splitProps(mergedProps, [
    "aspectRatio",
    "children",
    "defaultImage",
    "onCrop",
    "outputQuality",
    "outputType",
  ]);

  const [image, setImage] = createSignal<ImageCropImage | null>(null);
  const [options, setOptionsSignal] = createSignal(defaultOptions);
  const [viewportSize, setViewportSize] = createSignal(getFallbackViewportSize());
  const [lastScaleFactor, setLastScaleFactor] = createSignal(1);
  const [isCropping, setIsCropping] = createSignal(false);
  const aspectRatio = createMemo(() => getAspectRatio(local.aspectRatio));

  const scaleFactor = createMemo(() => {
    const currentImage = image();

    if (!currentImage) {
      return 1;
    }

    return calculateScaleFactor(currentImage, viewportSize());
  });

  const displaySize = createMemo(() => getDisplaySize(image(), scaleFactor()));

  const setOptions = (
    value: ImageCropOptions | ((previous: ImageCropOptions) => ImageCropOptions),
  ) => {
    setOptionsSignal((previous) => {
      const next = typeof value === "function" ? value(previous) : value;
      return clampCropOptions(next, displaySize(), aspectRatio());
    });
  };

  const replaceImage = (nextImage: ImageCropImage | null) => {
    setImage((previous) => {
      previous?.revoke?.();
      return nextImage;
    });
  };

  const resetCrop = () => {
    setOptionsSignal(getDefaultOptions(displaySize(), aspectRatio()));
  };

  const setImageAndResetCrop = (nextImage: ImageCropImage) => {
    const nextScale = calculateScaleFactor(nextImage, viewportSize());
    const nextSize = getDisplaySize(nextImage, nextScale);

    setLastScaleFactor(nextScale);
    replaceImage(nextImage);
    setOptionsSignal(getDefaultOptions(nextSize, aspectRatio()));
  };

  const setImageFromFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const nextImage = await createImageFromFile(file);
    setImageAndResetCrop(nextImage);
  };

  const setImageFromSource = async (source: ImageCropInitialImage) => {
    const nextImage = await createImageFromSource(source);
    setImageAndResetCrop(nextImage);
  };

  const cropImage = async () => {
    const currentImage = image();

    if (!currentImage || untrack(isCropping)) return null;

    setIsCropping(true);

    try {
      const currentOptions = options();
      const currentScale = scaleFactor();
      const sourceCrop = {
        height: currentOptions.height / currentScale,
        width: currentOptions.width / currentScale,
        x: currentOptions.x / currentScale,
        y: currentOptions.y / currentScale,
      };
      const outputWidth = Math.max(
        1,
        Math.round(currentOptions.original ? sourceCrop.width : currentOptions.width),
      );
      const outputHeight = Math.max(
        1,
        Math.round(currentOptions.original ? sourceCrop.height : currentOptions.height),
      );
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) return null;

      const img = await loadCanvasImage(currentImage.src);
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      context.drawImage(
        img,
        sourceCrop.x,
        sourceCrop.y,
        sourceCrop.width,
        sourceCrop.height,
        0,
        0,
        outputWidth,
        outputHeight,
      );

      const dataUrl = canvas.toDataURL(local.outputType, local.outputQuality);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const result: ImageCropResult = {
        blob,
        dataUrl,
        height: outputHeight,
        options: currentOptions,
        revoke: () => URL.revokeObjectURL(url),
        url,
        width: outputWidth,
      };

      local.onCrop?.(result);

      return result;
    } finally {
      setIsCropping(false);
    }
  };

  createEffect(() => {
    const currentImage = image();
    const nextScale = scaleFactor();
    const previousScale = lastScaleFactor();

    if (!currentImage || previousScale <= 0 || nextScale === previousScale) {
      setLastScaleFactor(nextScale);
      return;
    }

    const ratio = nextScale / previousScale;
    setLastScaleFactor(nextScale);
    setOptionsSignal((previous) =>
      clampCropOptions(
        {
          ...previous,
          height: Math.floor(previous.height * ratio),
          width: Math.floor(previous.width * ratio),
          x: Math.floor(previous.x * ratio),
          y: Math.floor(previous.y * ratio),
        },
        getDisplaySize(currentImage, nextScale),
        aspectRatio(),
      ),
    );
  });

  onMount(() => {
    if (!local.defaultImage) return;
    void setImageFromSource(local.defaultImage);
  });

  onCleanup(() => {
    image()?.revoke?.();
  });

  return (
    <ImageCropContext.Provider
      value={{
        aspectRatio,
        cropImage,
        displaySize,
        image,
        isCropping,
        options,
        resetCrop,
        setImageFromFile,
        setImageFromSource,
        setOptions,
        setViewportSize,
      }}
    >
      {local.children}
    </ImageCropContext.Provider>
  );
}

export { ImageCropProvider };
