import { Calendar, ChevronRight, Gauge, MoreHorizontal, RefreshCw, Repeat } from "lucide-solid";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/kobalte/ui/breadcrumb";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent, CardHeader } from "@/registry/kobalte/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/kobalte/ui/item";

export function Payments() {
  return (
    <Card>
      <CardHeader class="flex flex-col gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger as={Button} size="icon-sm" variant="ghost">
                  <MoreHorizontal />
                  <span class="sr-only">Account options</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Statements</DropdownMenuItem>
                    <DropdownMenuItem>Documents</DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Payments</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </CardHeader>
      <CardContent>
        <ItemGroup role="group">
          <Item as="a" href="/" variant="muted">
            <ItemMedia variant="icon">
              <Gauge />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Change transfer limit</ItemTitle>
              <ItemDescription>Adjust how much you can send from your balance.</ItemDescription>
            </ItemContent>
            <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
          </Item>
          <Item as="a" href="/" variant="muted">
            <ItemMedia variant="icon">
              <Calendar />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Scheduled transfers</ItemTitle>
              <ItemDescription>Set up a transfer to send at a later date.</ItemDescription>
            </ItemContent>
            <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
          </Item>
          <Item as="a" href="/" variant="muted">
            <ItemMedia variant="icon">
              <Repeat />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Direct Debits</ItemTitle>
              <ItemDescription>Set up and manage regular payments.</ItemDescription>
            </ItemContent>
            <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
          </Item>
          <Item as="a" href="/" variant="muted">
            <ItemMedia variant="icon">
              <RefreshCw />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Recurring card payments</ItemTitle>
              <ItemDescription>Manage your repeated card transactions.</ItemDescription>
            </ItemContent>
            <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
          </Item>
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
