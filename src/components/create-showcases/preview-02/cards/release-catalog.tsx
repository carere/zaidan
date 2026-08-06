import { Search } from "lucide-solid";
import { For } from "solid-js";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Card, CardContent, CardHeader } from "@/registry/kobalte/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/registry/kobalte/ui/item";
import { ToggleGroup, ToggleGroupItem } from "@/registry/kobalte/ui/toggle-group";

const HOLDINGS = [
  {
    ticker: "VOO",
    name: "Vanguard S&P 500 ETF",
    type: "ETF",
    added: "Jan 2021",
    shares: "112",
    value: "$48,230.40",
  },
  {
    ticker: "VIG",
    name: "Vanguard Dividend Appreciation",
    type: "ETF",
    added: "Mar 2022",
    shares: "450",
    value: "$26,033.79",
  },
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    type: "Stock",
    added: "Nov 2020",
    shares: "85",
    value: "$18,488.90",
  },
  {
    ticker: "O",
    name: "Realty Income Corp",
    type: "REIT",
    added: "Jun 2023",
    shares: "320",
    value: "$15,136.59",
  },
];

export function ReleaseCatalog() {
  return (
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between gap-3">
          <InputGroup class="max-w-sm">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search holdings or tickers..." />
          </InputGroup>
          <ToggleGroup defaultValue={["etfs"]} variant="outline" spacing={1}>
            <ToggleGroupItem value="stocks">Stocks</ToggleGroupItem>
            <ToggleGroupItem value="etfs">ETFs</ToggleGroupItem>
            <ToggleGroupItem value="reits">REITs</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        <ItemGroup role="group">
          <For each={HOLDINGS}>
            {(holding) => (
              <Item variant="muted">
                <ItemMedia>
                  <div class="flex size-12 items-center justify-center rounded-lg border text-sm font-semibold">
                    {holding.ticker}
                  </div>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{holding.name}</ItemTitle>
                  <ItemDescription class="text-xs tracking-wider uppercase">
                    {holding.shares} Shares · {holding.added}
                  </ItemDescription>
                </ItemContent>
                <div class="flex shrink-0 items-center gap-6">
                  <Badge variant="outline">{holding.type}</Badge>
                  <div class="flex flex-col items-end gap-0.5">
                    <span class="text-xs tracking-wider text-muted-foreground uppercase">
                      Value
                    </span>
                    <span class="font-medium tabular-nums">{holding.value}</span>
                  </div>
                </div>
              </Item>
            )}
          </For>
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
