import { notFound, redirect } from "@tanstack/solid-router";
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

export function compatibilityResponse(request: Request) {
  const url = new URL(request.url);
  const destination = resolveCompatibilityRedirect(`${url.pathname}${url.search}`);
  if (!destination) return new Response(null, { status: 404 });
  return new Response(null, {
    status: 308,
    headers: { Location: destination },
  });
}
