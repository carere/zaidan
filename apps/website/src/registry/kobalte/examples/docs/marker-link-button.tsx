import { GitBranch, RotateCcw } from "lucide-solid";
import { toast } from "solid-sonner";

import { Marker, MarkerContent, MarkerIcon } from "@/registry/kobalte/ui/marker";
import { Toaster } from "@/registry/kobalte/ui/toast";

export default function MarkerLinkButton() {
  return (
    <>
      <Toaster />
      <div class="flex w-full max-w-sm flex-col gap-8 py-12">
        <Marker as="a" href="#links-and-buttons">
          <MarkerIcon>
            <GitBranch />
          </MarkerIcon>
          <MarkerContent>View the pull request</MarkerContent>
        </Marker>
        <Marker
          as="button"
          type="button"
          class="transition-colors hover:text-foreground"
          onClick={() => toast("You clicked the revert button")}
        >
          <MarkerIcon>
            <RotateCcw />
          </MarkerIcon>
          <MarkerContent>Revert this change</MarkerContent>
        </Marker>
      </div>
    </>
  );
}
