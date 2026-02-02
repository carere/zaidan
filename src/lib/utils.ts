import { cookieStorage } from "@solid-primitives/storage";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getRequestHeaders, getResponseHeaders } from "@tanstack/solid-start/server";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
