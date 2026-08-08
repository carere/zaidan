import { GitBranch, RotateCcw } from "lucide-solid";

import { Marker, MarkerContent, MarkerIcon } from "@/registry/kobalte/ui/marker";
import { createToastManager, Toaster } from "@/registry/kobalte/ui/toast";

const toastManager = createToastManager();

export default function MarkerLinkButton() {
  return (
    <>
      <Toaster toastManager={toastManager} />
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
          onClick={() => toastManager.add({ description: "You clicked the revert button" })}
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
