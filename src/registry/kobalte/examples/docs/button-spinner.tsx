import { Button } from "@/registry/kobalte/ui/button";
import { Spinner } from "@/registry/kobalte/ui/spinner";

export default function ButtonSpinner() {
  return (
    <div class="flex gap-2">
      <Button variant="outline" disabled>
        <Spinner data-icon="inline-start" />
        Generating
      </Button>
      <Button variant="secondary" disabled>
        Downloading
        <Spinner data-icon="inline-end" />
      </Button>
    </div>
  );
}
