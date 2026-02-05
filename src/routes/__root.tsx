import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getCookie } from "@tanstack/solid-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { NotFoundPage } from "@/components/not-found-page";
import { siteConfig } from "@/lib/site";
import { DesignSystemConfigSchema } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  type ColorMode,
  ColorModeProvider,
} from "@/registry/kobalte/components/color-mode-provider";
import styleCss from "../styles.css?url";

export const Route = createRootRouteWithContext()({
  head: () => ({
    links: [
      { rel: "stylesheet", href: styleCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "canonical", href: siteConfig.url },
    ],
    meta: [
      { charset: "utf-8" },
      { title: siteConfig.name },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "description", content: siteConfig.description },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },

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
  validateSearch: zodValidator(DesignSystemConfigSchema),
  shellComponent: RootComponent,
  notFoundComponent: () => <NotFoundPage />,
});

const getColorMode = createIsomorphicFn()
  .server(() => getCookie("zaidan-color-mode") ?? "light")
  .client(
    () =>
      document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("zaidan-color-mode="))
        ?.split("=")[1] ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );

function RootComponent() {
  const colorMode = getColorMode() as ColorMode;
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
        <HeadContent />
      </head>
      <body class="style-vega">
        <ColorModeProvider initialColorMode={colorMode}>
          <Suspense>
            <Outlet />
            <TanStackRouterDevtools />
          </Suspense>
        </ColorModeProvider>
        <Scripts />
      </body>
    </html>
  );
}
