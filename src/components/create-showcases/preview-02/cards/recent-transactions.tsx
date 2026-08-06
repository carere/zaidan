import { Car, Coffee, MoreHorizontal, ShoppingCart, Tv, Wallet } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableRow } from "@/registry/kobalte/ui/table";

export function RecentTransactions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your latest account activity.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell class="w-10">
                <div class="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Coffee class="size-4 shrink-0" />
                </div>
              </TableCell>
              <TableCell>
                <div class="flex flex-col">
                  <span class="font-medium">Blue Bottle Coffee</span>
                  <span class="text-sm text-muted-foreground">Food & Drink</span>
                </div>
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">Today, 10:24 AM</TableCell>
              <TableCell class="text-right">
                <span class="text-sm font-semibold tabular-nums">-$6.50</span>
              </TableCell>
              <TableCell class="w-8">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    as={Button}
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Actions for Blue Bottle Coffee"
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View details</DropdownMenuItem>
                    <DropdownMenuItem>Add note</DropdownMenuItem>
                    <DropdownMenuItem>Categorize</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Dispute</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell class="w-10">
                <div class="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <ShoppingCart class="size-4 shrink-0" />
                </div>
              </TableCell>
              <TableCell>
                <div class="flex flex-col">
                  <span class="font-medium">Whole Foods Market</span>
                  <span class="text-sm text-muted-foreground">Groceries</span>
                </div>
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">Yesterday</TableCell>
              <TableCell class="text-right">
                <span class="text-sm font-semibold tabular-nums">-$142.30</span>
              </TableCell>
              <TableCell class="w-8">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    as={Button}
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Actions for Whole Foods Market"
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View details</DropdownMenuItem>
                    <DropdownMenuItem>Add note</DropdownMenuItem>
                    <DropdownMenuItem>Categorize</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Dispute</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell class="w-10">
                <div class="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Wallet class="size-4 shrink-0" />
                </div>
              </TableCell>
              <TableCell>
                <div class="flex flex-col">
                  <span class="font-medium">Stripe Payout</span>
                  <span class="text-sm text-muted-foreground">Income</span>
                </div>
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">Oct 12</TableCell>
              <TableCell class="text-right">
                <span class="text-sm font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                  +$4,200.00
                </span>
              </TableCell>
              <TableCell class="w-8">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    as={Button}
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Actions for Stripe Payout"
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View details</DropdownMenuItem>
                    <DropdownMenuItem>Add note</DropdownMenuItem>
                    <DropdownMenuItem>Categorize</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Dispute</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell class="w-10">
                <div class="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Car class="size-4 shrink-0" />
                </div>
              </TableCell>
              <TableCell>
                <div class="flex flex-col">
                  <span class="font-medium">Uber Technologies</span>
                  <span class="text-sm text-muted-foreground">Transport</span>
                </div>
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">Oct 11</TableCell>
              <TableCell class="text-right">
                <span class="text-sm font-semibold tabular-nums">-$24.10</span>
              </TableCell>
              <TableCell class="w-8">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    as={Button}
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Actions for Uber Technologies"
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View details</DropdownMenuItem>
                    <DropdownMenuItem>Add note</DropdownMenuItem>
                    <DropdownMenuItem>Categorize</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Dispute</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell class="w-10">
                <div class="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Tv class="size-4 shrink-0" />
                </div>
              </TableCell>
              <TableCell>
                <div class="flex flex-col">
                  <span class="font-medium">Netflix Subscription</span>
                  <span class="text-sm text-muted-foreground">Entertainment</span>
                </div>
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">Oct 10</TableCell>
              <TableCell class="text-right">
                <span class="text-sm font-semibold tabular-nums">-$19.99</span>
              </TableCell>
              <TableCell class="w-8">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    as={Button}
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Actions for Netflix Subscription"
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View details</DropdownMenuItem>
                    <DropdownMenuItem>Add note</DropdownMenuItem>
                    <DropdownMenuItem>Categorize</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Dispute</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
