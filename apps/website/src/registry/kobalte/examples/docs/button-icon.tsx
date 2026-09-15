import { CircleFadingArrowUpIcon } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";

export default function ButtonIcon() {
  return (
    <Button variant="outline" size="icon" aria-label="Move up">
      <CircleFadingArrowUpIcon />
    </Button>
  );
}
