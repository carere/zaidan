import {
  DEFAULT_CROP_RATIO,
  DEFAULT_CROP_SIZE,
  MAX_STAGE_HEIGHT_RATIO,
  MAX_STAGE_WIDTH_RATIO,
} from "./constants";
import type { ImageCropImage, ImageCropOptions, ResizeHandleDirection } from "./types";

const defaultOptions: ImageCropOptions = {
  height: DEFAULT_CROP_SIZE,
  original: true,
  width: DEFAULT_CROP_SIZE,
  x: 0,
  y: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function roundPixel(value: number) {
  return Math.max(0, Math.round(value));
}

function roundDimension(value: number) {
  return Math.max(1, roundPixel(value));
}

function getAspectRatio(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function getFallbackViewportSize() {
  if (typeof window === "undefined") {
    return { height: 720, width: 960 };
  }

  return {
    height: window.innerHeight * 0.78,
    width: window.innerWidth * 0.78,
  };
}

function calculateScaleFactor(
  image: Pick<ImageCropImage, "height" | "width">,
  viewportSize: { height: number; width: number },
) {
  const fallback = getFallbackViewportSize();
  const availableWidth = Math.max(
    1,
    (viewportSize.width || fallback.width) * MAX_STAGE_WIDTH_RATIO,
  );
  const availableHeight = Math.max(
    1,
    (viewportSize.height || fallback.height) * MAX_STAGE_HEIGHT_RATIO,
  );
  const widthRatio = availableWidth / image.width;
  const heightRatio = availableHeight / image.height;

  return Math.min(1, widthRatio, heightRatio);
}

function getDisplaySize(image: Pick<ImageCropImage, "height" | "width"> | null, scale: number) {
  if (!image) {
    return { height: 0, width: 0 };
  }

  return {
    height: Math.max(1, Math.floor(image.height * scale)),
    width: Math.max(1, Math.floor(image.width * scale)),
  };
}

function clampCropOptions(
  options: ImageCropOptions,
  bounds: { height: number; width: number },
  aspectRatio: number | null = null,
): ImageCropOptions {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { ...defaultOptions, original: options.original };
  }

  let width = clamp(roundPixel(options.width), 1, bounds.width);
  let height = clamp(roundPixel(options.height), 1, bounds.height);

  if (aspectRatio) {
    const widthCandidate = {
      height: roundDimension(width / aspectRatio),
      width,
    };
    const heightCandidate = {
      height,
      width: roundDimension(height * aspectRatio),
    };
    const candidates = [widthCandidate, heightCandidate].filter(
      (candidate) => candidate.width <= bounds.width && candidate.height <= bounds.height,
    );
    const bestSize =
      candidates.sort(
        (a, b) =>
          Math.abs(a.width - options.width) +
          Math.abs(a.height - options.height) -
          (Math.abs(b.width - options.width) + Math.abs(b.height - options.height)),
      )[0] ?? getLargestAspectSize(bounds, aspectRatio);

    width = bestSize.width;
    height = bestSize.height;
  }

  const x = clamp(roundPixel(options.x), 0, bounds.width - width);
  const y = clamp(roundPixel(options.y), 0, bounds.height - height);

  return {
    height,
    original: options.original,
    width,
    x,
    y,
  };
}

function getLargestAspectSize(bounds: { height: number; width: number }, aspectRatio: number) {
  let width = Math.max(1, bounds.width);
  let height = width / aspectRatio;

  if (height > bounds.height) {
    height = Math.max(1, bounds.height);
    width = height * aspectRatio;
  }

  return {
    height: roundDimension(height),
    width: roundDimension(width),
  };
}

function getDefaultOptions(
  bounds: { height: number; width: number },
  aspectRatio: number | null = null,
): ImageCropOptions {
  const defaultSize = aspectRatio
    ? getLargestAspectSize(bounds, aspectRatio)
    : {
        height: Math.min(DEFAULT_CROP_SIZE, Math.max(1, bounds.height)),
        width: Math.min(DEFAULT_CROP_SIZE, Math.max(1, bounds.width)),
      };
  const width = aspectRatio
    ? roundDimension(defaultSize.width * DEFAULT_CROP_RATIO)
    : defaultSize.width;
  const height = aspectRatio ? roundDimension(width / aspectRatio) : defaultSize.height;

  return {
    height,
    original: true,
    width,
    x: Math.max(0, Math.floor((bounds.width - width) / 2)),
    y: Math.max(0, Math.floor((bounds.height - height) / 2)),
  };
}

function resizeCrop(
  handle: ResizeHandleDirection,
  crop: ImageCropOptions,
  deltaX: number,
  deltaY: number,
  aspectRatio: number | null = null,
) {
  if (aspectRatio) {
    const resizesHorizontally = handle.includes("e") || handle.includes("w");
    const resizesVertically = handle.includes("n") || handle.includes("s");
    const widthFromHorizontal = handle.includes("w") ? crop.width - deltaX : crop.width + deltaX;
    const heightFromVertical = handle.includes("n") ? crop.height - deltaY : crop.height + deltaY;
    const widthFromVertical = heightFromVertical * aspectRatio;
    let width = crop.width;

    if (resizesHorizontally && resizesVertically) {
      width =
        Math.abs(widthFromHorizontal - crop.width) >= Math.abs(widthFromVertical - crop.width)
          ? widthFromHorizontal
          : widthFromVertical;
    } else if (resizesHorizontally) {
      width = widthFromHorizontal;
    } else if (resizesVertically) {
      width = widthFromVertical;
    }

    const height = width / aspectRatio;
    let x = crop.x;
    let y = crop.y;

    if (handle.includes("w")) {
      x = crop.x + crop.width - width;
    } else if (!handle.includes("e")) {
      x = crop.x + (crop.width - width) / 2;
    }

    if (handle.includes("n")) {
      y = crop.y + crop.height - height;
    } else if (!handle.includes("s")) {
      y = crop.y + (crop.height - height) / 2;
    }

    return {
      ...crop,
      height,
      width,
      x,
      y,
    };
  }

  let { height, width, x, y } = crop;

  if (handle.includes("e")) {
    width += deltaX;
  }

  if (handle.includes("s")) {
    height += deltaY;
  }

  if (handle.includes("w")) {
    x += deltaX;
    width -= deltaX;
  }

  if (handle.includes("n")) {
    y += deltaY;
    height -= deltaY;
  }

  return {
    ...crop,
    height,
    width,
    x,
    y,
  };
}

export {
  calculateScaleFactor,
  clampCropOptions,
  defaultOptions,
  getAspectRatio,
  getDefaultOptions,
  getDisplaySize,
  getFallbackViewportSize,
  resizeCrop,
};
