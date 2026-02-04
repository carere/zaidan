import { cookieStorage } from "@solid-primitives/storage";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getRequestHeaders, getResponseHeaders } from "@tanstack/solid-start/server";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TocEntry } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getStorage = createIsomorphicFn()
  .server(() =>
    cookieStorage.withOptions({
      expires: new Date(Date.now() + 3e10),
      getRequestHeaders: () => getRequestHeaders(),
      getResponseHeaders: () => getResponseHeaders(),
    }),
  )
  .client(() =>
    cookieStorage.withOptions({
      expires: new Date(Date.now() + 3e10),
    }),
  );

/**
 * Flattens nested TOC entries into a list of URL fragments for scroll spy
 */
export const flattenTocUrls = (entries: TocEntry): string[] => {
  const urls: string[] = [];
  for (const entry of entries) {
    urls.push(entry.url);
    if (entry.items.length > 0) {
      urls.push(...flattenTocUrls(entry.items));
    }
  }
  return urls;
};
