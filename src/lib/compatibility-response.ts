import { resolveCompatibilityRedirect } from "@/lib/product-routing";

export function compatibilityResponse(request: Request) {
  const url = new URL(request.url);
  const destination = resolveCompatibilityRedirect(`${url.pathname}${url.search}${url.hash}`);
  if (!destination) return new Response(null, { status: 404 });
  return new Response(null, {
    status: 308,
    headers: { Location: destination },
  });
}
