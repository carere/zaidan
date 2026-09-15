import { Marker, MarkerContent, MarkerIcon } from "@/registry/kobalte/ui/marker";
import { Spinner } from "@/registry/kobalte/ui/spinner";

export default function MarkerStatus() {
  return (
    <div class="flex w-full max-w-sm flex-col gap-8 py-12">
      <Marker role="status">
        <MarkerIcon>
          <Spinner />
        </MarkerIcon>
        <MarkerContent>Compacting conversation</MarkerContent>
      </Marker>
      <Marker variant="separator" role="status">
        <MarkerIcon>
          <Spinner />
        </MarkerIcon>
        <MarkerContent>Running tests</MarkerContent>
      </Marker>
    </div>
  );
}
