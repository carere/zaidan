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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/registry/kobalte/ui/input-group";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
} from "@/registry/kobalte/ui/item";
import { NativeSelect, NativeSelectOption } from "@/registry/kobalte/ui/native-select";
import { Progress } from "@/registry/kobalte/ui/progress";

export function SavingsTargets() {
  return (
    <div class="grid grid-cols-2 gap-(--gap)">
      <Card>
        <CardHeader>
          <CardTitle>Savings Targets</CardTitle>
          <CardDescription>Active milestones for 2024</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm">
              New Goal
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ItemGroup role="group" class="gap-3">
            <Item variant="muted" class="flex-col items-stretch">
              <ItemContent class="gap-3">
                <ItemDescription class="z-font-heading text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Retirement
                </ItemDescription>
                <span class="text-3xl font-semibold tabular-nums">$420,000</span>
                <Progress value={65} aria-label="Retirement progress" />
              </ItemContent>
              <ItemFooter>
                <span class="text-sm text-muted-foreground">65% achieved</span>
                <span class="text-sm font-medium tabular-nums">$273,000</span>
              </ItemFooter>
            </Item>
            <Item variant="muted" class="flex-col items-stretch">
              <ItemContent class="gap-3">
                <ItemDescription class="z-font-heading text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Real Estate
                </ItemDescription>
                <span class="text-3xl font-semibold tabular-nums">$85,000</span>
                <Progress value={32} aria-label="Home purchase progress" />
              </ItemContent>
              <ItemFooter>
                <span class="text-sm text-muted-foreground">32% achieved</span>
                <span class="text-sm font-medium tabular-nums">$27,200</span>
              </ItemFooter>
            </Item>
          </ItemGroup>
        </CardContent>
        <CardFooter>
          <CardDescription class="text-center">
            You have not met your targets for this year.
          </CardDescription>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Buy Investment</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-1 flex-col gap-3">
          <FieldGroup class="flex-1">
            <Field>
              <FieldLabel for="invest-amount">Amount to Invest</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>$</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput id="invest-amount" defaultValue="1,000.00" />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel for="invest-type">Order Type</FieldLabel>
              <NativeSelect id="invest-type" defaultValue="market">
                <NativeSelectOption value="market">Market Order</NativeSelectOption>
                <NativeSelectOption value="limit">Limit Order</NativeSelectOption>
                <NativeSelectOption value="stop">Stop Order</NativeSelectOption>
              </NativeSelect>
              <FieldDescription>Market orders execute at the current price.</FieldDescription>
            </Field>
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-muted-foreground">Estimated Shares</span>
                <span class="text-sm font-semibold tabular-nums">1.95</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-muted-foreground">Buying Power</span>
                <span class="text-sm font-semibold tabular-nums">$12,450.00</span>
              </div>
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter class="flex-col gap-3">
          <Button class="w-full">Review Order</Button>
          <CardDescription class="text-center">
            Trades are typically executed within minutes during market hours.
          </CardDescription>
        </CardFooter>
      </Card>
    </div>
  );
}
