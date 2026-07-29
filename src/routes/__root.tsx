import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
} from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getCookie } from "@tanstack/solid-start/server";
import { Show, Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { NotFoundPage } from "@/components/not-found-page";
import { ProductHeader } from "@/components/product-header";
import { getProductSurfaceForPath } from "@/lib/product-routing";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  type ColorMode,
  ColorModeProvider,
  getClientColorMode,
} from "@/registry/kobalte/components/color-mode";
import styleCss from "../styles.css?url";

export const Route = createRootRouteWithContext()({
  head: () => ({
    links: [
      { rel: "stylesheet", href: styleCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
    meta: [
      { charset: "utf-8" },
      { title: siteConfig.name },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "description", content: siteConfig.description },
      // Open Graph
      { property: "og:locale", content: "en_US" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: siteConfig.name },
      { property: "og:description", content: siteConfig.description },
      { property: "og:url", content: siteConfig.url },
      { property: "og:site_name", content: siteConfig.name },
      { property: "og:image", content: `${siteConfig.url}${siteConfig.ogImage}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "628" },
      { property: "og:image:alt", content: siteConfig.description },

      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: siteConfig.name },
      { name: "twitter:description", content: siteConfig.description },
      { name: "twitter:image", content: `${siteConfig.url}${siteConfig.ogImage}` },
      { name: "twitter:image:width", content: "1200" },
      { name: "twitter:image:height", content: "628" },
      { name: "twitter:image:alt", content: siteConfig.description },
    ],
  }),
  shellComponent: RootComponent,
  notFoundComponent: () => <NotFoundPage />,
});

const getColorMode = createIsomorphicFn()
  .server(() => getCookie("zaidan-color-mode") ?? "light")
  .client(getClientColorMode);

function RootComponent() {
  const colorMode = getColorMode() as ColorMode;
  const location = useLocation();
  return (
    <html
      lang="en"
      class={cn("no-scrollbar", {
        light: colorMode === "light",
        dark: colorMode === "dark",
      })}
    >
      <head>
        <HydrationScript />
      </head>
      <body class="style-vega">
        <HeadContent />
        <ColorModeProvider initialColorMode={colorMode}>
          <Suspense>
            <Show when={getProductSurfaceForPath(location().pathname)} fallback={<Outlet />}>
              <div class="min-h-svh">
                <ProductHeader />
                <Outlet />
              </div>
            </Show>
            <TanStackRouterDevtools />
          </Suspense>
        </ColorModeProvider>
        <Scripts />
      </body>
    </html>
  );
}
