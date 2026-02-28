import { InfoIcon, StarIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/kobalte/ui/input-group";
import { Label } from "@/registry/kobalte/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/kobalte/ui/popover";

export default function InputGroupButtonExample() {
  const [isFavorite, setIsFavorite] = createSignal(false);

  return (
    <div class="grid w-full max-w-sm gap-6">
      <Label for="input-secure-19" class="sr-only">
        Input Secure
      </Label>
      <InputGroup class="[--radius:9999px]">
        <InputGroupInput id="input-secure-19" class="pl-0.5!" />
        <Popover placement="bottom-start">
          <InputGroupAddon>
            <PopoverTrigger
              as={InputGroupButton}
              variant="secondary"
              size="icon-xs"
              aria-label="Info"
            >
              <InfoIcon />
            </PopoverTrigger>
          </InputGroupAddon>
          <PopoverContent class="flex flex-col gap-1 rounded-xl text-sm">
            <p class="font-medium">Your connection is not secure.</p>
            <p>You should not enter any sensitive information on this site.</p>
          </PopoverContent>
        </Popover>
        <InputGroupAddon class="pl-1! text-muted-foreground">https://</InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            onClick={() => setIsFavorite(!isFavorite())}
            size="icon-xs"
            aria-label="Favorite"
          >
            <StarIcon
              data-favorite={isFavorite()}
              class="data-[favorite=true]:fill-primary data-[favorite=true]:stroke-primary"
            />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
