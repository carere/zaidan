import { Building2Icon, CreditCardIcon, WalletIcon } from "lucide-solid";
import { createSignal } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

export default function DropdownMenuRadioIcons() {
  const [paymentMethod, setPaymentMethod] = createSignal("card");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger as={Button} variant="outline" class="w-fit">
        Payment Method
      </DropdownMenuTrigger>
      <DropdownMenuContent class="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Select Payment Method</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={paymentMethod()} onChange={setPaymentMethod}>
            <DropdownMenuRadioItem value="card">
              <CreditCardIcon />
              Credit Card
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="paypal">
              <WalletIcon />
              PayPal
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="bank">
              <Building2Icon />
              Bank Transfer
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
