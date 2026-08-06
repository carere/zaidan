import { ArrowRight } from "lucide-solid";
import { createSignal, For } from "solid-js";

import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroup } from "@/registry/kobalte/ui/button-group";
import { Input } from "@/registry/kobalte/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/registry/kobalte/ui/select";

const currencies = [
  { label: "US Dollar", value: "$" },
  { label: "Euro", value: "€" },
  { label: "British Pound", value: "£" },
];

export default function ButtonGroupSelect() {
  const [currency, setCurrency] = createSignal("$");

  return (
    <ButtonGroup>
      <ButtonGroup>
        <Select value={currency()} onValueChange={(value) => setCurrency(value ?? "$")}>
          <SelectTrigger class="font-mono">{currency()}</SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            <SelectGroup>
              <For each={currencies}>
                {(item) => (
                  <SelectItem value={item.value}>
                    {item.value} <span class="text-muted-foreground">{item.label}</span>
                  </SelectItem>
                )}
              </For>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input placeholder="10.00" inputmode="numeric" />
      </ButtonGroup>
      <ButtonGroup>
        <Button aria-label="Send" size="icon" variant="outline">
          <ArrowRight />
        </Button>
      </ButtonGroup>
    </ButtonGroup>
  );
}
