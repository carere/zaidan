import { MoreHorizontalIcon } from "lucide-solid";
import { For } from "solid-js";
import { Button } from "@/registry/kobalte/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/kobalte/ui/table";

const products = [
  { name: "Wireless Mouse", price: "$29.99" },
  { name: "Mechanical Keyboard", price: "$129.99" },
  { name: "USB-C Hub", price: "$49.99" },
];

export default function TableActions() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Price</TableHead>
          <TableHead class="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <For each={products}>
          {(product) => (
            <TableRow>
              <TableCell class="font-medium">{product.name}</TableCell>
              <TableCell>{product.price}</TableCell>
              <TableCell class="text-right">
                <DropdownMenu placement="bottom-end">
                  <DropdownMenuTrigger
                    as={Button}
                    variant="ghost"
                    size="icon"
                    class="size-8"
                    aria-label={`Open actions for ${product.name}`}
                  >
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )}
        </For>
      </TableBody>
    </Table>
  );
}
