import { Button } from "@/registry/kobalte/ui/button";
import { Input } from "@/registry/kobalte/ui/input";
import { Label } from "@/registry/kobalte/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";

export default function PopoverDemo() {
  return (
    <Popover>
      <PopoverTrigger as={Button} variant="outline">
        Open popover
      </PopoverTrigger>
      <PopoverContent class="w-80">
        <div class="grid gap-4">
          <div class="space-y-2">
            <h4 class="leading-none font-medium">Dimensions</h4>
            <p class="text-sm text-muted-foreground">Set the dimensions for the layer.</p>
          </div>
          <div class="grid gap-2">
            <div class="grid grid-cols-3 items-center gap-4">
              <Label for="popover-demo-width">Width</Label>
              <Input id="popover-demo-width" defaultValue="100%" class="col-span-2 h-8" />
            </div>
            <div class="grid grid-cols-3 items-center gap-4">
              <Label for="popover-demo-max-width">Max. width</Label>
              <Input id="popover-demo-max-width" defaultValue="300px" class="col-span-2 h-8" />
            </div>
            <div class="grid grid-cols-3 items-center gap-4">
              <Label for="popover-demo-height">Height</Label>
              <Input id="popover-demo-height" defaultValue="25px" class="col-span-2 h-8" />
            </div>
            <div class="grid grid-cols-3 items-center gap-4">
              <Label for="popover-demo-max-height">Max. height</Label>
              <Input id="popover-demo-max-height" defaultValue="none" class="col-span-2 h-8" />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
