import { assertCanonicalRoutingModel } from "../src/lib/product-routing";
import { discoverRoutePatterns } from "./route-file-discovery";

assertCanonicalRoutingModel({ availableRoutePatterns: await discoverRoutePatterns() });
