import { Check, ChevronRight, Clock3, FileText, GitBranch, Search, UserRound } from "lucide-solid";
import { createSignal, Show } from "solid-js";

import { Button } from "@/registry/kobalte/ui/button";
import { Marker, MarkerContent, MarkerIcon } from "@/registry/kobalte/ui/marker";
import { Spinner } from "@/registry/kobalte/ui/spinner";

export default function MarkerExample() {
  const [clicked, setClicked] = createSignal(false);

  return (
    <div class="flex w-full max-w-2xl flex-col gap-8 p-4">
      <section class="flex flex-col gap-3">
        <h2 class="font-heading text-sm font-medium">Markers</h2>
        <div class="flex flex-col gap-3">
          <Marker>
            <MarkerContent>A default marker</MarkerContent>
          </Marker>
          <Marker>
            <MarkerIcon>
              <FileText />
            </MarkerIcon>
            <MarkerContent>Marker with icon</MarkerContent>
          </Marker>
          <Marker role="status">
            <MarkerIcon>
              <Spinner />
            </MarkerIcon>
            <MarkerContent>Marker with a spinner</MarkerContent>
          </Marker>
          <Marker role="status">
            <MarkerContent class="shimmer">Thinking...</MarkerContent>
          </Marker>
          <Marker as="a" href="#marker-link">
            <MarkerIcon>
              <GitBranch />
            </MarkerIcon>
            <MarkerContent>Marker as a link</MarkerContent>
          </Marker>
          <Marker as="button" type="button" onClick={() => setClicked(true)} class="text-left">
            <MarkerIcon>
              <Clock3 />
            </MarkerIcon>
            <MarkerContent class="flex-1">
              <span>Marker as a button</span>
              <Show when={clicked()}>
                <span class="text-xs text-primary">Clicked</span>
              </Show>
            </MarkerContent>
            <MarkerIcon>
              <ChevronRight />
            </MarkerIcon>
          </Marker>
          <Marker>
            <MarkerIcon>
              <UserRound />
            </MarkerIcon>
            <MarkerContent>Rhea joined the chat</MarkerContent>
          </Marker>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="font-heading text-sm font-medium">Border and separator</h2>
        <div class="flex flex-col gap-4">
          <Marker variant="border">
            <MarkerIcon>
              <GitBranch />
            </MarkerIcon>
            <MarkerContent>Switched to release-candidate</MarkerContent>
          </Marker>
          <Marker variant="separator">
            <MarkerContent>Worked for 42s</MarkerContent>
          </Marker>
          <Marker variant="separator" role="status">
            <MarkerIcon>
              <Check />
            </MarkerIcon>
            <MarkerContent>Conversation compacted</MarkerContent>
          </Marker>
          <Marker variant="separator">
            <MarkerContent>
              <Button variant="outline" size="sm">
                <Search />
                Explored 4 files
              </Button>
            </MarkerContent>
          </Marker>
        </div>
      </section>
    </div>
  );
}
