import { ColorModeProvider, ColorModeScript, cookieStorageManagerSSR } from "@kobalte/core";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getCookie } from "@tanstack/solid-start/server";
import { Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { Shell } from "@/components/shell";
import { StyleProvider } from "@/lib/style-context";
import type { Style } from "@/lib/types";
import { ViewProvider } from "@/lib/view-context";
import styleCss from "../styles.css?url";

export const Route = createRootRouteWithContext()({
  head: () => ({
    links: [
      { rel: "stylesheet", href: styleCss },
      { rel: "icon", href: "/zaidan.svg", type: "image/svg+xml" },
    ],
    meta: [
      { charset: "utf-8" },
      { content: "width=device-width, initial-scale=1.0", name: "viewport" },
      { title: "Zaidan", name: "title" },
    ],
  }),
  shellComponent: RootComponent,
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

function RootComponent() {
  const storageManager = cookieStorageManagerSSR(getServerCookies());
  const initialStyle = getStyleCookie();
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <HydrationScript />
      </head>
      <body class="overflow-hidden overscroll-none antialiased [--header-height:calc(var(--spacing)*14)]">
        <ColorModeScript storageType={storageManager.type} />
        <ColorModeProvider storageManager={storageManager}>
          <StyleProvider initialStyle={initialStyle}>
            <ViewProvider>
              <Suspense>
                <Shell />
                <TanStackRouterDevtools />
              </Suspense>
            </ViewProvider>
          </StyleProvider>
        </ColorModeProvider>
        <Scripts />
      </body>
    </html>
  );
}
