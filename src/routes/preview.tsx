import { ColorModeProvider, ColorModeScript, cookieStorageManagerSSR } from "@kobalte/core";
import { createFileRoute, HeadContent, Outlet, Scripts } from "@tanstack/solid-router";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getCookie } from "@tanstack/solid-start/server";
import { Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { StyleProvider } from "@/lib/style-context";
import type { Style } from "@/lib/types";
import styleCss from "../styles.css?url";

export const Route = createFileRoute("/preview")({
  head: () => ({
    links: [
      { rel: "stylesheet", href: styleCss },
      { rel: "icon", href: "/zaidan.svg", type: "image/svg+xml" },
    ],
    meta: [
      { charset: "utf-8" },
      { content: "width=device-width, initial-scale=1.0", name: "viewport" },
      { title: "Component Preview | Zaidan", name: "title" },
    ],
  }),
  component: PreviewLayout,
});

const getServerCookies = createIsomorphicFn()
  .server(() => {
    const colorMode = getCookie("kb-color-mode");
    return colorMode ? `kb-color-mode=${colorMode}` : "";
  })
  .client(() => document.cookie);

const getStyleCookie = createIsomorphicFn()
  .server((): Style => {
    const styleCookie = getCookie("zaidan-style");
    return (styleCookie as Style) || "vega";
  })
  .client((): Style => {
    // On client, the cookie will be read by the storage manager
    return "vega";
  });

function PreviewLayout() {
  const storageManager = cookieStorageManagerSSR(getServerCookies());
  const initialStyle = getStyleCookie();

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <HydrationScript />
      </head>
      <body class={`style-${initialStyle} overflow-auto overscroll-none antialiased`}>
        <ColorModeScript storageType={storageManager.type} />
        <ColorModeProvider storageManager={storageManager}>
          <StyleProvider initialStyle={initialStyle}>
            <Suspense
              fallback={
                <div class="flex h-screen w-full items-center justify-center">Loading...</div>
              }
            >
              <Outlet />
            </Suspense>
          </StyleProvider>
        </ColorModeProvider>
        <Scripts />
      </body>
    </html>
  );
}
