import { Button } from "@/registry/kobalte/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/kobalte/ui/popover";

export default function PopoverBasic() {
  return (
    <Popover placement="bottom-start">
      <PopoverTrigger as={Button} variant="outline" class="w-fit">
        Open Popover
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
