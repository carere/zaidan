import { ArrowUpIcon } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";

export default function ButtonRounded() {
  return (
    <div class="flex gap-2">
      <Button class="rounded-full">Get Started</Button>
      <Button variant="outline" size="icon" class="rounded-full" aria-label="Move up">
        <ArrowUpIcon />
      </Button>
    </div>
  );
}
