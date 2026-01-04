import { ColorModeProvider, ColorModeScript, cookieStorageManagerSSR } from "@kobalte/core";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getCookie } from "@tanstack/solid-start/server";
import { Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { Shell } from "@/components/shell";
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

function RootComponent() {
  const storageManager = cookieStorageManagerSSR(getServerCookies());
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <HydrationScript />
      </head>
      <body class="style-vega group/body overscroll-none antialiased [--footer-height:calc(var(--spacing)*14)] [--header-height:calc(var(--spacing)*14)] xl:[--footer-height:calc(var(--spacing)*24)]">
        <ColorModeScript storageType={storageManager.type} />
        <ColorModeProvider storageManager={storageManager}>
          <Suspense>
            <Shell />
            <TanStackRouterDevtools />
          </Suspense>
        </ColorModeProvider>
        <Scripts />
      </body>
    </html>
  );
}
