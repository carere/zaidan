import { cookieStorage } from "@solid-primitives/storage";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getRequestHeaders, getResponseHeaders } from "@tanstack/solid-start/server";
import { cn } from "@/lib/cn";
import type { TocEntry } from "@/lib/types";

export { cn };

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

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** Formats a date in the format "Month Year" */
export const fmtDate = (iso: string) => monthYearFormatter.format(new Date(iso));
