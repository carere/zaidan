import {
  ArrowRightIcon,
  CalendarIcon,
  CircleEllipsisIcon,
  RefreshCwIcon,
  SettingsIcon,
} from "lucide-solid";
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
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu placement="bottom-start">
                <DropdownMenuTrigger
                  as={Button}
                  class=""
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Account options"
                >
                  <CircleEllipsisIcon />
                  <span class="sr-only">Account options</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
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
        <ItemGroup>
          {/* biome-ignore lint/a11y/useSemanticElements: ItemGroup uses a role-based list. */}
          <div role="listitem" class="w-full">
            <Item variant="muted" as="a" href="#">
              <ItemMedia variant="icon">
                <SettingsIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Change transfer limit</ItemTitle>
                <ItemDescription>Adjust how much you can send from your balance.</ItemDescription>
              </ItemContent>
              <ArrowRightIcon class="size-4 shrink-0 text-muted-foreground" />
            </Item>
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: ItemGroup uses a role-based list. */}
          <div role="listitem" class="w-full">
            <Item variant="muted" as="a" href="#">
              <ItemMedia variant="icon">
                <CalendarIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Scheduled transfers</ItemTitle>
                <ItemDescription>Set up a transfer to send at a later date.</ItemDescription>
              </ItemContent>
              <ArrowRightIcon class="size-4 shrink-0 text-muted-foreground" />
            </Item>
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: ItemGroup uses a role-based list. */}
          <div role="listitem" class="w-full">
            <Item variant="muted" as="a" href="#">
              <ItemMedia variant="icon">
                <RefreshCwIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Recurring card payments</ItemTitle>
                <ItemDescription>Manage your repeated card transactions.</ItemDescription>
              </ItemContent>
              <ArrowRightIcon class="size-4 shrink-0 text-muted-foreground" />
            </Item>
          </div>
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
