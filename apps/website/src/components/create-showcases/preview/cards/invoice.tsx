import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/kobalte/ui/table";

const INVOICE_ITEMS = [
  { item: "Design System License", qty: 1, unitPrice: 499 },
  { item: "Priority Support", qty: 12, unitPrice: 99 },
  { item: "Custom Components", qty: 3, unitPrice: 250 },
] as const;

const subtotal = INVOICE_ITEMS.reduce((sum, row) => sum + row.qty * row.unitPrice, 0);
const tax = 0;
const totalDue = subtotal + tax;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function Invoice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice #INV-2847</CardTitle>
        <CardDescription>Due March 30, 2026</CardDescription>
        <CardAction>
          <Badge variant="secondary">Pending</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <section class="z-table-container" tabindex="0" aria-label="Invoice items">
          <table data-slot="table" class="z-table">
            <caption class="sr-only">Invoice items and totals</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead class="text-right">Qty</TableHead>
                <TableHead class="text-right">Rate</TableHead>
                <TableHead class="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={INVOICE_ITEMS}>
                {(row) => (
                  <TableRow>
                    <TableCell>{row.item}</TableCell>
                    <TableCell class="text-right tabular-nums">{row.qty}</TableCell>
                    <TableCell class="text-right tabular-nums">
                      {formatCurrency(row.unitPrice)}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {formatCurrency(row.qty * row.unitPrice)}
                    </TableCell>
                  </TableRow>
                )}
              </For>
              <TableRow>
                <TableCell colSpan={3} class="text-right">
                  Subtotal
                </TableCell>
                <TableCell class="text-right tabular-nums">{formatCurrency(subtotal)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} class="text-right">
                  Tax
                </TableCell>
                <TableCell class="text-right tabular-nums">$0.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} class="text-right">
                  Total Due
                </TableCell>
                <TableCell class="text-right tabular-nums">{formatCurrency(totalDue)}</TableCell>
              </TableRow>
            </TableBody>
          </table>
        </section>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          Download PDF
        </Button>
        <Button size="sm" class="ml-auto">
          Pay Now
        </Button>
      </CardFooter>
    </Card>
  );
}

import { For } from "solid-js";
