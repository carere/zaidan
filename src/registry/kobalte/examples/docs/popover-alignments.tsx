import { Button } from "@/registry/kobalte/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";

export default function PopoverAlignments() {
  return (
    <div class="flex gap-6">
      <Popover placement="bottom-start">
        <PopoverTrigger as={Button} variant="outline" size="sm">
          Start
        </PopoverTrigger>
        <PopoverContent class="w-40">Aligned to start</PopoverContent>
      </Popover>
      <Popover placement="bottom">
        <PopoverTrigger as={Button} variant="outline" size="sm">
          Center
        </PopoverTrigger>
        <PopoverContent class="w-40">Aligned to center</PopoverContent>
      </Popover>
      <Popover placement="bottom-end">
        <PopoverTrigger as={Button} variant="outline" size="sm">
          End
        </PopoverTrigger>
        <PopoverContent class="w-40">Aligned to end</PopoverContent>
      </Popover>
    </div>
  );
}
