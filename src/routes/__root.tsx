import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getCookie } from "@tanstack/solid-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
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
      { rel: "icon", href: "/zaidan.svg", type: "image/svg+xml" },
    ],
    meta: [
      { charset: "utf-8" },
      { content: "width=device-width, initial-scale=1.0", name: "viewport" },
      { title: "Zaidan", name: "title" },
    ],
  }),
  validateSearch: zodValidator(DesignSystemConfigSchema),
  shellComponent: RootComponent,
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
        <HeadContent />
        <HydrationScript />
      </head>
      <body class="style-vega no-scrollbar">
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
