import { ArrowRight } from "lucide-solid";
import { createSignal } from "solid-js";

import { Button } from "@/registry/kobalte/ui/button";
import { ButtonGroup } from "@/registry/kobalte/ui/button-group";
import { Input } from "@/registry/kobalte/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/registry/kobalte/ui/select";

const currencies = [
  { label: "US Dollar", value: "$" },
  { label: "Euro", value: "€" },
  { label: "British Pound", value: "£" },
];

export default function ButtonGroupSelect() {
  const [currency, setCurrency] = createSignal(currencies[0].value);

  return (
    <ButtonGroup>
      <ButtonGroup>
        <Select
          options={currencies}
          optionValue="value"
          optionTextValue="label"
          value={currencies.find((item) => item.value === currency())}
          onChange={(item) => setCurrency(item?.value ?? "$")}
          itemComponent={(props) => (
            <SelectItem item={props.item}>
              {props.item.rawValue.value}{" "}
              <span class="text-muted-foreground">{props.item.rawValue.label}</span>
            </SelectItem>
          )}
        >
          <SelectTrigger class="font-mono">{currency()}</SelectTrigger>
          <SelectContent />
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
