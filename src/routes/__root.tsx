import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { createIsomorphicFn } from "@tanstack/solid-start";
import { getCookie } from "@tanstack/solid-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { type ColorMode, ColorModeProvider } from "@/lib/color-mode";
import { DesignSystemConfigSchema } from "@/lib/types";
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
        ?.split("=")[1] ?? "light",
  );

function RootComponent() {
  const colorMode = getColorMode() as ColorMode;
  return (
    <html lang="en" class={colorMode}>
      <head>
        <HeadContent />
        <HydrationScript />
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
