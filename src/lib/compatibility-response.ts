import { LEGACY_ANCHOR_QUERY_KEY, resolveCompatibilityRedirect } from "@/lib/product-routing";

export function compatibilityResponse(request: Request) {
  const url = new URL(request.url);
  const destination = resolveCompatibilityRedirect(`${url.pathname}${url.search}${url.hash}`);
  if (!destination) return new Response(null, { status: 404 });
  const location = new URL(destination, url);

  // Browsers do not transmit fragments to the server. Returning Location
  // without a fragment lets redirect processing retain an incoming fragment;
  // the query marker supplies the authored fallback when none exists.
  if (!url.hash && location.hash) {
    location.searchParams.set(LEGACY_ANCHOR_QUERY_KEY, location.hash.slice(1));
    location.hash = "";
  }
  return new Response(null, {
    status: 308,
    headers: { Location: `${location.pathname}${location.search}${location.hash}` },
  });
}
