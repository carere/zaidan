import { notFound, redirect } from "@tanstack/solid-router";
import { compatibilityResponse } from "@/lib/compatibility-response";
import { resolveCompatibilityRedirect } from "@/lib/product-routing";

type RouteLocation = {
  pathname: string;
  searchStr: string;
  hash: string;
};

export function throwCompatibilityRedirect(location: RouteLocation): never {
  const destination = resolveCompatibilityRedirect(
    `${location.pathname}${location.searchStr}${location.hash}`,
  );
  if (!destination) throw notFound();
  throw redirect({ href: destination, statusCode: 308 });
}

export function compatibilityRouteOptions() {
  return {
    server: {
      handlers: {
        GET: ({ request }: { request: Request }) => compatibilityResponse(request),
      },
    },
    beforeLoad: ({ location }: { location: RouteLocation }) => throwCompatibilityRedirect(location),
  };
}
