import { Check, Clock3, FileText, GitBranch } from "lucide-solid";

import { Example, ExampleWrapper } from "@/components/example";
import { Marker, MarkerContent, MarkerIcon } from "@/registry/kobalte/ui/marker";
import { Spinner } from "@/registry/kobalte/ui/spinner";

export default function MarkerDemo() {
  return (
    <ExampleWrapper>
      <Example title="Default">
        <div class="flex w-full flex-col gap-4">
          <Marker>
            <MarkerContent>A default marker</MarkerContent>
          </Marker>
          <Marker>
            <MarkerIcon>
              <FileText />
            </MarkerIcon>
            <MarkerContent>Marker with an icon</MarkerContent>
          </Marker>
          <Marker role="status">
            <MarkerIcon>
              <Spinner />
            </MarkerIcon>
            <MarkerContent>Compacting conversation</MarkerContent>
          </Marker>
        </div>
      </Example>
      <Example title="Variants">
        <div class="flex w-full flex-col gap-4">
          <Marker variant="border">
            <MarkerIcon>
              <GitBranch />
            </MarkerIcon>
            <MarkerContent>Switched to release-candidate</MarkerContent>
          </Marker>
          <Marker variant="separator">
            <MarkerContent>Worked for 42s</MarkerContent>
          </Marker>
          <Marker variant="separator">
            <MarkerIcon>
              <Check />
            </MarkerIcon>
            <MarkerContent>Conversation compacted</MarkerContent>
          </Marker>
        </div>
      </Example>
      <Example title="Link">
        <Marker as="a" href="#marker-demo">
          <MarkerIcon>
            <Clock3 />
          </MarkerIcon>
          <MarkerContent>View file activity</MarkerContent>
        </Marker>
      </Example>
    </ExampleWrapper>
  );
}
