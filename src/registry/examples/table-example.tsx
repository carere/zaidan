import { MoreHorizontal } from "lucide-solid";
import { For } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";
import { Input } from "@/registry/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/ui/table";

const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV005",
    paymentStatus: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV006",
    paymentStatus: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV007",
    paymentStatus: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
];

export default function TableExample() {
  return (
    <ExampleWrapper>
      <TableBasic />
      <TableWithFooter />
      <TableSimple />
      <TableWithBadges />
      <TableWithActions />
      <TableWithSelect />
      <TableWithInput />
    </ExampleWrapper>
  );
}

function TableBasic() {
  return (
    <Example title="Basic">
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[100px]">Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead class="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={invoices.slice(0, 3)}>
            {(invoice) => (
              <TableRow>
                <TableCell class="font-medium">{invoice.invoice}</TableCell>
                <TableCell>{invoice.paymentStatus}</TableCell>
                <TableCell>{invoice.paymentMethod}</TableCell>
                <TableCell class="text-right">{invoice.totalAmount}</TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </Example>
  );
}

function TableWithFooter() {
  return (
    <Example title="With Footer">
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[100px]">Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead class="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={invoices.slice(0, 3)}>
            {(invoice) => (
              <TableRow>
                <TableCell class="font-medium">{invoice.invoice}</TableCell>
                <TableCell>{invoice.paymentStatus}</TableCell>
                <TableCell>{invoice.paymentMethod}</TableCell>
                <TableCell class="text-right">{invoice.totalAmount}</TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell class="text-right">$2,500.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Example>
  );
}

function TableSimple() {
  return (
    <Example title="Simple">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead class="text-right">Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell class="font-medium">Sarah Chen</TableCell>
            <TableCell>sarah.chen@acme.com</TableCell>
            <TableCell class="text-right">Admin</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="font-medium">Marc Rodriguez</TableCell>
            <TableCell>marcus.rodriguez@acme.com</TableCell>
            <TableCell class="text-right">User</TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="font-medium">Emily Watson</TableCell>
            <TableCell>emily.watson@acme.com</TableCell>
            <TableCell class="text-right">User</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Example>
  );
}

function TableWithBadges() {
  return (
    <Example title="With Badges">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell class="font-medium">Design homepage</TableCell>
            <TableCell>
              <span class="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 font-medium text-green-700 text-xs dark:text-green-400">
                Completed
              </span>
            </TableCell>
            <TableCell class="text-right">
              <span class="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-1 font-medium text-blue-700 text-xs dark:text-blue-400">
                High
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="font-medium">Implement API</TableCell>
            <TableCell>
              <span class="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-1 font-medium text-xs text-yellow-700 dark:text-yellow-400">
                In Progress
              </span>
            </TableCell>
            <TableCell class="text-right">
              <span class="inline-flex items-center rounded-full bg-gray-500/10 px-2 py-1 font-medium text-gray-700 text-xs dark:text-gray-400">
                Medium
              </span>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell class="font-medium">Write tests</TableCell>
            <TableCell>
              <span class="inline-flex items-center rounded-full bg-gray-500/10 px-2 py-1 font-medium text-gray-700 text-xs dark:text-gray-400">
                Pending
              </span>
            </TableCell>
            <TableCell class="text-right">
              <span class="inline-flex items-center rounded-full bg-gray-500/10 px-2 py-1 font-medium text-gray-700 text-xs dark:text-gray-400">
                Low
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Example>
  );
}

function TableWithActions() {
  const products = [
    { name: "Wireless Mouse", price: "$29.99" },
    { name: "Mechanical Keyboard", price: "$129.99" },
    { name: "USB-C Hub", price: "$49.99" },
  ];

  return (
    <Example title="With Actions">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger as={Button} variant="ghost" size="icon" class="size-8">
                      <MoreHorizontal />
                      <span class="sr-only">Open menu</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
    </Example>
  );
}

const people = [
  { value: "sarah", label: "Sarah Chen" },
  { value: "marcus", label: "Marc Rodriguez" },
  { value: "emily", label: "Emily Watson" },
  { value: "david", label: "David Kim" },
];

const tasks = [
  {
    task: "Design homepage",
    assignee: "sarah",
    status: "In Progress",
  },
  {
    task: "Implement API",
    assignee: "marcus",
    status: "Pending",
  },
  {
    task: "Write tests",
    assignee: "emily",
    status: "Not Started",
  },
];

function TableWithSelect() {
  return (
    <Example title="With Select">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={tasks}>
            {(item) => (
              <TableRow>
                <TableCell class="font-medium">{item.task}</TableCell>
                <TableCell>
                  <Select
                    options={people}
                    optionValue="value"
                    optionTextValue="label"
                    defaultValue={people.find((person) => person.value === item.assignee)}
                    itemComponent={(props) => (
                      <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
                    )}
                  >
                    <SelectTrigger class="w-40" size="sm">
                      <SelectValue<(typeof people)[number]>>
                        {(state) => state.selectedOption()?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                </TableCell>
                <TableCell>{item.status}</TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </Example>
  );
}

function TableWithInput() {
  const products = [
    { name: "Wireless Mouse", price: "$29.99" },
    { name: "Mechanical Keyboard", price: "$129.99" },
    { name: "USB-C Hub", price: "$49.99" },
  ];

  return (
    <Example title="With Input">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={products}>
            {(product, index) => (
              <TableRow>
                <TableCell class="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Input type="number" value={index() === 1 ? "2" : "1"} class="h-8 w-20" min="0" />
                </TableCell>
                <TableCell>{product.price}</TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </Example>
  );
}
