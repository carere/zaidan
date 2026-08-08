import { Button } from "@/registry/kobalte/ui/button";
import { Kbd } from "@/registry/kobalte/ui/kbd";

export default function KbdButton() {
  return (
    <Button variant="outline">
      Accept{" "}
      <Kbd class="translate-x-0.5" data-icon="inline-end">
        ⏎
      </Kbd>
    </Button>
  );
}
