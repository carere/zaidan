import { Button } from "@/registry/kobalte/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";

export default function PopoverAlignments() {
  return (
    <div class="flex gap-6">
      <Popover>
        <PopoverTrigger as={Button} variant="outline" size="sm">
          Start
        </PopoverTrigger>
        <PopoverContent align="start" class="w-40">
          Aligned to start
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger as={Button} variant="outline" size="sm">
          Center
        </PopoverTrigger>
        <PopoverContent align="center" class="w-40">
          Aligned to center
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger as={Button} variant="outline" size="sm">
          End
        </PopoverTrigger>
        <PopoverContent align="end" class="w-40">
          Aligned to end
        </PopoverContent>
      </Popover>
    </div>
  );
}
